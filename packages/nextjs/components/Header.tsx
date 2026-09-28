"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { PulseMark } from "~~/components/pulse";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-hbar";

const NAV = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Docs", href: "/docs" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contracts", href: "/debug" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const NetworkBadge = () => {
  const { targetNetwork } = useTargetNetwork();
  return (
    <span
      className="hidden items-center gap-2 rounded-md border border-white/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted md:inline-flex"
      title={`Target network: ${targetNetwork.name}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_#00F5A0]" aria-hidden />
      {targetNetwork.name}
    </span>
  );
};

/** Site header: wordmark, the four sections, then the network badge and the wallet. */
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
        className={`relative text-sm transition-colors duration-150 ${
          mobile ? "rounded-lg px-3 py-2 hover:bg-white/[0.04]" : "px-1 py-5"
        } ${active ? "text-fg" : "text-muted hover:text-fg"}`}
      >
        {item.label}
        {active && !mobile && (
          <span
            className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[linear-gradient(90deg,#00F5A0,#00D1FF)] shadow-[0_0_10px_#00F5A0]"
            aria-hidden
          />
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-6">
        <details className="relative lg:hidden" ref={menuRef}>
          <summary
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-muted hover:text-fg [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </summary>
          <nav
            className="absolute left-0 top-12 z-50 flex w-56 flex-col gap-0.5 rounded-xl border border-white/10 bg-raised p-2 shadow-[0_16px_40px_rgb(0_0_0/0.6)]"
            onClick={() => menuRef.current?.removeAttribute("open")}
          >
            {NAV.map(item => (
              <React.Fragment key={item.href}>{link(item, true)}</React.Fragment>
            ))}
          </nav>
        </details>

        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Tidepool home">
          <PulseMark />
          <span className="text-lg font-bold tracking-tight text-fg">tidepool</span>
        </Link>

        <nav className="ml-8 hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map(item => (
            <React.Fragment key={item.href}>{link(item)}</React.Fragment>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <NetworkBadge />
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </header>
  );
};
