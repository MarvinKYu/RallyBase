"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/players", label: "Players" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop nav links — hidden below sm breakpoint */}
      <div className="hidden items-center gap-6 sm:flex">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Mobile: hamburger button */}
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          // × close icon
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        ) : (
          // ☰ hamburger icon
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-zinc-200 bg-white px-6 py-4 sm:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-zinc-700 transition-colors hover:text-zinc-900"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
