"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRightIcon,
  Bars3Icon,
  BugAntIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useRefreshTick } from "~~/app/_components/tidepool/motion";
import { TidepoolMark } from "~~/components/TidepoolMark";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { useNetworkColor, useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { HASHSCAN_URL } from "~~/utils/tidepool/constants";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  /** Opens in a new tab (outside the app). */
  external?: boolean;
};

/**
 * Developer tools, grouped away from the product. The template's built-in block explorer only works on a local
 * chain, so on Hedera Testnet the menu links to HashScan instead (the /blockexplorer route still exists).
 */
export const developerLinks: HeaderMenuLink[] = [
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
  {
    label: "HashScan (Testnet)",
    href: HASHSCAN_URL,
    icon: <MagnifyingGlassIcon className="h-4 w-4" />,
    external: true,
  },
];

const MenuLink = ({ label, href, icon, external }: HeaderMenuLink) => {
  const pathname = usePathname();
  const isActive = !external && pathname === href;
  const className = `${
    isActive ? "text-base-content bg-white/[0.06]" : "text-base-content/60 hover:text-base-content"
  } gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors`;
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {icon}
          <span>{label}</span>
          <ArrowUpRightIcon className="h-3 w-3 opacity-50" aria-hidden />
        </a>
      ) : (
        <Link href={href} passHref className={className}>
          {icon}
          <span>{label}</span>
        </Link>
      )}
    </li>
  );
};

const NetworkIndicator = () => {
  const { targetNetwork } = useTargetNetwork();
  const color = useNetworkColor();
  return (
    <span
      className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-xs text-base-content/70"
      title={`Target network: ${targetNetwork.name}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {targetNetwork.name}
    </span>
  );
};

/** Hairline under the header; one light sweep each time the vault data actually refreshes. */
const RefreshHairline = () => {
  const tick = useRefreshTick();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden" aria-hidden>
      {tick > 0 && (
        <span
          key={tick}
          className="tp-sweep absolute inset-y-0 left-0 block w-1/3 bg-[linear-gradient(90deg,transparent,#6e7bff,#3ee0c5,transparent)]"
        />
      )}
    </div>
  );
};

/**
 * Site header: Tidepool branding, the target Hedera network, the wallet, and developer tools in their own menu.
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  const devMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => burgerMenuRef?.current?.removeAttribute("open"));
  useOutsideClick(devMenuRef, () => devMenuRef?.current?.removeAttribute("open"));

  return (
    <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080b]/75 backdrop-blur-md">
      <RefreshHairline />
      <div className="navbar mx-auto min-h-0 max-w-6xl gap-2 px-4 py-2.5">
        <div className="navbar-start w-auto gap-1 sm:gap-2">
          <details className="dropdown lg:hidden" ref={burgerMenuRef}>
            <summary className="btn btn-ghost btn-sm px-2 shadow-none" aria-label="Menu">
              <Bars3Icon className="h-5 w-5" />
            </summary>
            <ul
              className="menu menu-sm dropdown-content mt-3 w-56 rounded-box border border-white/[0.08] bg-[#111319] p-2 shadow-xl"
              onClick={() => burgerMenuRef?.current?.removeAttribute("open")}
            >
              <MenuLink label="Dashboard" href="/" />
              <li className="menu-title text-[11px] uppercase tracking-widest text-base-content/40">Developer</li>
              {developerLinks.map(link => (
                <MenuLink key={link.href} {...link} />
              ))}
            </ul>
          </details>
          <Link
            href="/"
            passHref
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="Tidepool on Hedera, home"
          >
            <TidepoolMark className="h-8 w-8 transition-transform duration-300 group-hover:rotate-[-8deg]" />
            <span className="flex flex-col leading-none">
              <span className="tp-display text-[23px] text-base-content">Tidepool</span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-base-content/40">
                on Hedera
              </span>
            </span>
          </Link>
          <ul className="menu menu-horizontal menu-sm ml-6 hidden items-center gap-1 px-1 lg:flex">
            <MenuLink label="Dashboard" href="/" />
            <li>
              <details ref={devMenuRef}>
                <summary className="gap-1 rounded-lg px-3 py-1.5 text-sm text-base-content/60 after:hidden hover:text-base-content">
                  Developer
                  <ChevronDownIcon className="h-3 w-3" />
                </summary>
                <ul className="z-30 w-56 rounded-box border border-white/[0.08] bg-[#111319] p-2 shadow-xl">
                  {developerLinks.map(link => (
                    <MenuLink key={link.href} {...link} />
                  ))}
                </ul>
              </details>
            </li>
          </ul>
        </div>
        <div className="navbar-end grow gap-3">
          <NetworkIndicator />
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </div>
  );
};
