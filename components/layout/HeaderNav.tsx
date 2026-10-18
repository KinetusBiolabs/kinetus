"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { CartLink } from "./CartLink";
import { IconLinks } from "./IconLinks";
import { MobileNav } from "./MobileNav";
import { NavDropdown } from "./NavDropdown";
import type { NavItem } from "@/lib/site";
import styles from "./HeaderNav.module.css";

type HeaderNavProps = {
  items: NavItem[];
  /** The free-shipping line for the drawer (Header reads the amount). */
  shippingLine: string;
};

/**
 * Desktop navigation (dropdown per item with children, plain link otherwise), the icon
 * cluster and the mobile drawer, owned together so the nav can never wrap: the list is
 * measured against the space beside the logo and, whenever it would overflow, it
 * collapses into the drawer instead.
 */
export function HeaderNav({ items, shippingLine }: HeaderNavProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Until the first measurement the slot clips, so an overflowing list never spills over
  // the logo before hydration; afterwards it must not clip, or dropdown panels are cut off.
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const list = listRef.current;
    if (!slot || !list) {
      return;
    }
    const measure = () => {
      // The list is right-aligned, so overflow spills to the left where scrollWidth
      // cannot see it: measure the span from the first item to the last instead.
      // Below the desktop breakpoint the slot is display:none and everything reads 0.
      const first = list.firstElementChild;
      const last = list.lastElementChild;
      if (!first || !last) {
        return;
      }
      const span = last.getBoundingClientRect().right - first.getBoundingClientRect().left;
      setCollapsed(span > slot.clientWidth + 1);
      setMeasured(true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    return () => observer.disconnect();
  }, [items]);

  return (
    <>
      <div
        ref={slotRef}
        className={[
          styles.slot,
          collapsed ? styles.collapsed : "",
          measured ? "" : styles.measuring,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <nav className={styles.nav} aria-label="Primary" aria-hidden={collapsed}>
          <ul ref={listRef} className={styles.list}>
            {items.map((item) =>
              item.children ? (
                <NavDropdown key={item.href} item={item} />
              ) : (
                <li key={item.href} className={styles.item}>
                  <Link
                    href={item.href}
                    className={`type-nav ${styles.link}`}
                    tabIndex={collapsed ? -1 : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      </div>

      <IconLinks />

      <MobileNav items={items} forceVisible={collapsed} shippingLine={shippingLine} />

      <CartLink />
    </>
  );
}
