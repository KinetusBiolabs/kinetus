/**
 * Sets the login email and password of the site's one admin account, interactively.
 *
 *   npm run admin:set-credentials
 *
 * Asks for the email (Enter keeps the current one), then the new password twice with
 * nothing echoed. The password is never accepted from arguments or environment variables,
 * never printed and never written anywhere but as a bcrypt hash, made the way the app does
 * (bcryptjs, cost 12; lib/admin/auth.ts). The email is trimmed and lower-cased, as the
 * sign-in form does. Password rules are the existing ones from admin:create.
 *
 * Before changing anything it shows the database host (no credentials) and the account,
 * and waits for y. It changes nothing unless exactly one admin account exists. Saving
 * signs that admin out of every open session (sessions are rows in AdminSession).
 *
 * Needs an interactive terminal: hidden input cannot be read from a pipe.
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

/** The app's cost (lib/admin/auth.ts) and admin:create's rules (scripts/admin-create.ts). */
const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;
/** bcrypt ignores everything after 72 bytes, so longer passwords are refused. */
const MAX_PASSWORD_BYTES = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAME = "admin:set-credentials";

function stop(message: string): never {
  console.error(`${NAME}: ${message}`);
  process.exit(1);
}

/**
 * Reads one line from the terminal in raw mode. Visible input is echoed as typed; hidden
 * input echoes nothing. Backspace edits, Enter finishes, Ctrl+C or Ctrl+D aborts.
 */
function ask(question: string, { hidden = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    let value = "";
    output.write(question);
    input.setRawMode(true);
    input.setEncoding("utf8");
    input.resume();

    const finish = (result: string | null) => {
      input.removeListener("data", onData);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
      if (result === null) {
        console.log("Cancelled. Nothing was changed.");
        process.exit(130);
      }
      resolve(result);
    };

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          finish(value);
          return;
        }
        if (char === "\u0003" || char === "\u0004") {
          finish(null);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = [...value].slice(0, -1).join("");
            if (!hidden) {
              output.write("\b \b");
            }
          }
          continue;
        }
        if (char < " ") {
          continue;
        }
        value += char;
        if (!hidden) {
          output.write(char);
        }
      }
    };
    input.on("data", onData);
  });
}

/** DATABASE_URL with its username and password replaced by asterisks. */
function maskedDatabaseUrl(): string {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (url.username) {
      url.username = "****";
    }
    if (url.password) {
      url.password = "****";
    }
    return url.toString();
  } catch {
    stop("DATABASE_URL is missing or not a valid URL. Nothing was changed.");
  }
}

function passwordProblem(password: string): string | null {
  if ([...password].length < MIN_PASSWORD_LENGTH) {
    return `the password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `the password is longer than ${MAX_PASSWORD_BYTES} bytes; use a shorter one.`;
  }
  return null;
}

async function main() {
  if (process.argv.length > 2) {
    stop("this script takes no arguments; it asks for everything. Nothing was changed.");
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    stop("run this in an interactive terminal (hidden input cannot be piped). Nothing was changed.");
  }

  console.log(`Database: ${maskedDatabaseUrl()}`);

  const prisma = new PrismaClient();
  try {
    const admins = await prisma.adminUser.findMany({
      select: { id: true, email: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (admins.length !== 1) {
      console.log(`Admin accounts found: ${admins.length}.`);
      for (const admin of admins) {
        console.log(`  ${admin.email} (created ${admin.createdAt.toISOString()})`);
      }
      stop("this script changes the one admin account, and there is not exactly one. Nothing was changed.");
    }

    const [admin] = admins;
    const sessions = await prisma.adminSession.count({ where: { adminUserId: admin.id } });
    console.log(`Admin account: ${admin.email}`);
    console.log(
      `  created ${admin.createdAt.toISOString()}, last sign-in ${admin.lastLoginAt?.toISOString() ?? "never"}, ${sessions} open session(s)`,
    );
    console.log("");

    const emailInput = await ask(`Login email (Enter keeps ${admin.email}): `);
    const email = (emailInput.trim() === "" ? admin.email : emailInput).trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      stop("that is not an email address. Nothing was changed.");
    }

    const password = await ask("New password (hidden): ", { hidden: true });
    const problem = passwordProblem(password);
    if (problem) {
      stop(`${problem} Nothing was changed.`);
    }
    const confirmation = await ask("Type the new password again (hidden): ", { hidden: true });
    if (confirmation !== password) {
      stop("the two passwords do not match. Nothing was changed.");
    }

    console.log("");
    console.log(`About to change the admin account on ${new URL(maskedDatabaseUrl()).host}:`);
    console.log(
      email === admin.email
        ? `  ${admin.email}: new password`
        : `  ${admin.email} -> ${email}, with the new password`,
    );
    console.log(`  and sign it out of ${sessions} open session(s).`);
    const answer = await ask("Continue? [y/N] ");
    if (answer.trim().toLowerCase() !== "y") {
      console.log("Nothing was changed.");
      return;
    }

    const passwordHash = await hash(password, BCRYPT_COST);
    const [, signedOut] = await prisma.$transaction([
      prisma.adminUser.update({ where: { id: admin.id }, data: { email, passwordHash } }),
      prisma.adminSession.deleteMany({ where: { adminUserId: admin.id } }),
    ]);
    console.log(
      `Done. The admin signs in as ${email} with the new password at /admin/login. Signed out ${signedOut.count} session(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Prisma errors never contain the password: it is only ever hashed before the write.
  console.error(`${NAME} failed:`, error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
