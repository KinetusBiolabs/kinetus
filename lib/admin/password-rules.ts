/**
 * The admin password rules, for the in-admin Change password form: at least 12 characters,
 * at most 72 bytes. The same rules as scripts/admin-create.ts and
 * scripts/set-admin-credentials.ts, which keep their own copies (a script runs when it is
 * imported, so the app cannot import the rule from them). Pure, no database.
 */

export const MIN_PASSWORD_LENGTH = 12;
/** bcrypt ignores everything after 72 bytes, so longer passwords are refused. */
export const MAX_PASSWORD_BYTES = 72;

/** Why a new password is refused, or null when it meets the rules. */
export function passwordProblem(password: string): string | null {
  if ([...password].length < MIN_PASSWORD_LENGTH) {
    return `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `The new password is longer than ${MAX_PASSWORD_BYTES} bytes; use a shorter one.`;
  }
  return null;
}
