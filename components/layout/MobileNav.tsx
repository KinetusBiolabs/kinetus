"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Container } from "./Container";
import {
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  TruckIcon,
} from "@/components/icons/LineIcons";
import {
  HEADER_ICON_LINKS,
  SITE_NAME,
  UTILITY_BAR_LINES,
  type NavItem,
} from "@/lib/site";
import styles from "./MobileNav.module.css";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

/**
 * The full-colour logo (772 x 183) at 40px tall on a small white panel, as in the footer:
 * the flat white copy lost the wordmark's letterforms on the navy drawer.
 */
const LOCKUP = { src: "/brand/kinetus-logo-horizontal.png", width: 169, height: 40 };

type MobileNavProps = {
  items: NavItem[];
  /** Shown above the desktop breakpoint too, when the desktop nav would overflow. */
  forceVisible?: boolean;
  /** The utility bar's free-shipping line, with the Admin > Settings amount. */
  shippingLine: string;
};

/**
 * Mobile navigation: 48 x 48 menu trigger on the right of the header and a full-height
 * navy drawer (white text). Top bar with the white lockup and a close trigger, a search
 * field that submits GET /search?q=, accordion rows for items with children and plain
 * rows otherwise, and the utility strings at the
 * bottom. Focus is trapped inside the drawer while open, body scroll is locked, Escape
 * closes, and focus returns to the trigger.
 */
export function MobileNav({ items, forceVisible = false, shippingLine }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const drawerId = useId();
  const searchId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // While open: lock body scroll, move focus into the drawer, close on Escape, and close
  // if the viewport grows to desktop (unless the desktop nav has collapsed into us).
  // On close, restore focus to the menu trigger.
  useEffect(() => {
    if (!open) {
      return;
    }
    const toggle = toggleRef.current;
    document.body.classList.add("nav-open");
    closeRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const onMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches && !forceVisible) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    mediaQuery.addEventListener("change", onMediaChange);

    return () => {
      document.body.classList.remove("nav-open");
      document.removeEventListener("keydown", onKeyDown);
      mediaQuery.removeEventListener("change", onMediaChange);
      toggle?.focus();
    };
  }, [open, forceVisible]);

  // Focus trap: Tab and Shift+Tab cycle within the drawer's visible controls.
  const onDrawerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) {
      return;
    }
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled])",
      ),
    ).filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0);
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const toggleClass = forceVisible ? `${styles.toggle} ${styles.forced}` : styles.toggle;
  const drawerClass = [
    styles.drawer,
    open ? styles.drawerOpen : "",
    forceVisible ? styles.forced : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className={toggleClass}
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <MenuIcon size={28} />
      </button>

      <div
        ref={drawerRef}
        id={drawerId}
        className={drawerClass}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        inert={!open}
        onKeyDown={onDrawerKeyDown}
      >
        <div className={styles.top}>
          <div className={styles.topBar}>
            <Container className={styles.topRow}>
              <Link
                href="/"
                className={styles.logoLink}
                aria-label={`${SITE_NAME} home`}
                onClick={close}
              >
                <Image
                  src={LOCKUP.src}
                  alt={SITE_NAME}
                  width={LOCKUP.width}
                  height={LOCKUP.height}
                  className={styles.logo}
                  loading="eager"
                />
              </Link>
              <button
                ref={closeRef}
                type="button"
                className={styles.close}
                aria-label="Close menu"
                onClick={close}
              >
                <CloseIcon size={28} />
              </button>
            </Container>
          </div>

          <Container className={styles.searchWrap}>
            <form
              action={HEADER_ICON_LINKS.search.href}
              method="get"
              role="search"
              className={styles.search}
            >
              <label htmlFor={searchId} className="visually-hidden">
                Search the catalogue
              </label>
              <input
                id={searchId}
                type="search"
                name="q"
                className={styles.searchInput}
                placeholder="Search products"
                autoComplete="off"
                enterKeyHint="search"
              />
              <button type="submit" className={styles.searchSubmit} aria-label="Search">
                <SearchIcon size={22} />
              </button>
            </form>
          </Container>

          <Container as="nav" className={styles.body} aria-label="Mobile primary">
            <ul className={styles.list}>
              {items.map((item) => {
                if (!item.children) {
                  return (
                    <li key={item.href} className={styles.item}>
                      <Link href={item.href} className={styles.link} onClick={close}>
                        {item.label}
                      </Link>
                    </li>
                  );
                }

                const isExpanded = expanded === item.href;
                const subId = `${drawerId}-${item.href.replace(/[^a-z0-9]+/gi, "-")}`;
                return (
                  <li key={item.href} className={styles.item}>
                    <button
                      type="button"
                      className={styles.row}
                      aria-expanded={isExpanded}
                      aria-controls={subId}
                      onClick={() => setExpanded(isExpanded ? null : item.href)}
                    >
                      <span>{item.label}</span>
                      <ChevronDownIcon
                        size={20}
                        className={
                          isExpanded
                            ? `${styles.rowChevron} ${styles.rowChevronOpen}`
                            : styles.rowChevron
                        }
                      />
                    </button>
                    <div
                      id={subId}
                      className={isExpanded ? `${styles.sub} ${styles.subOpen}` : styles.sub}
                      inert={!isExpanded}
                    >
                      <div className={styles.subInner}>
                        <ul className={styles.subList}>
                          {item.children.map((child) => (
                            <li key={`${child.href}-${child.label}`}>
                              <Link href={child.href} className={styles.subLink} onClick={close}>
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Container>
        </div>

        <div className={styles.bottom}>
          <Container className={styles.bottomInner}>
            <hr className={styles.rule} />
            <p className={styles.notice}>
              <span className={styles.noticeLine}>{UTILITY_BAR_LINES[0]}</span>
              <span className={styles.bullet} aria-hidden="true">
                •
              </span>
              <span className={styles.noticeLine}>{UTILITY_BAR_LINES[1]}</span>
            </p>
            <Link href="/shipping-policy" className={styles.shipping} onClick={close}>
              <TruckIcon size={20} className={styles.secondaryIcon} />
              <span>{shippingLine}</span>
            </Link>
          </Container>
        </div>
      </div>
    </>
  );
}
