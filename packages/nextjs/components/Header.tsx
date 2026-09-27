"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { TidepoolMark } from "~~/components/TidepoolMark";
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
      className="hidden items-center gap-2 rounded-lg border border-line px-2 py-1 text-xs text-muted sm:inline-flex"
      title={`Target network: ${targetNetwork.name}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
      {targetNetwork.name}
    </span>
  );
};

/** Site header: wordmark, the four sections, then the network badge and the wallet. */
export const Header = () => {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(menuRef, () => menuRef.current?.removeAttribute("open"));

  const link = (item: (typeof NAV)[number]) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`rounded-lg px-3 py-1.5 text-sm ${active ? "bg-raised text-fg" : "text-muted hover:text-fg"}`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <details className="relative lg:hidden" ref={menuRef}>
          <summary
            className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-muted hover:text-fg [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </summary>
          <nav
            className="absolute left-0 top-10 z-30 flex w-52 flex-col gap-1 rounded-lg border border-line bg-raised p-2 shadow-[0_4px_16px_rgb(0_0_0/0.35)]"
            onClick={() => menuRef.current?.removeAttribute("open")}
          >
            {NAV.map(item => (
              <React.Fragment key={item.href}>{link(item)}</React.Fragment>
            ))}
          </nav>
        </details>

        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Tidepool home">
          <TidepoolMark className="h-6 w-6" />
          <span className="text-base font-semibold text-fg">Tidepool</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
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
