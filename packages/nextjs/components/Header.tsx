"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { Logo } from "~~/components/pulse/Logo";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { useOutsideClick } from "~~/hooks/scaffold-hbar";

const NAV = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Docs", href: "/docs" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contracts", href: "/debug" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** Site header: wordmark, the five sections, then the wallet. */
export const Header = () => {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(menuRef, () => menuRef.current?.removeAttribute("open"));

  const link = (item: (typeof NAV)[number], mobile = false) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`text-sm font-medium transition-colors duration-150 ${
          mobile ? "rounded-lg px-3 py-2 hover:bg-white/[0.04]" : "px-1 py-2"
        } ${active ? "text-neon" : "text-muted hover:text-fg"}`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neon/[0.08] bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-5 sm:px-8 lg:px-12">
        <details className="relative lg:hidden" ref={menuRef}>
          <summary
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-muted hover:text-fg [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </summary>
          <nav
            className="absolute left-0 top-12 z-50 flex w-56 flex-col gap-0.5 rounded-xl border border-neon/15 bg-raised p-2 shadow-[0_16px_40px_rgb(0_0_0/0.6)]"
            onClick={() => menuRef.current?.removeAttribute("open")}
          >
            {NAV.map(item => (
              <React.Fragment key={item.href}>{link(item, true)}</React.Fragment>
            ))}
          </nav>
        </details>

        <Logo />

        <nav className="ml-auto hidden items-center gap-8 lg:flex" aria-label="Main">
          {NAV.map(item => (
            <React.Fragment key={item.href}>{link(item)}</React.Fragment>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-8">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </header>
  );
};
