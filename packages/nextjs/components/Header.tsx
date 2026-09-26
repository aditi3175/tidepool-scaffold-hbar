"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, BugAntIcon, ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { useNetworkColor, useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-hbar";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

/** Developer tools from the Scaffold-HBAR template, kept but grouped away from the product. */
export const developerLinks: HeaderMenuLink[] = [
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
  {
    label: "Block Explorer",
    href: "/blockexplorer",
    icon: <MagnifyingGlassIcon className="h-4 w-4" />,
  },
];

const MenuLink = ({ label, href, icon }: HeaderMenuLink) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <li>
      <Link
        href={href}
        passHref
        className={`${isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-primary/5"} py-1.5 px-3 text-sm gap-2`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
};

const NetworkIndicator = () => {
  const { targetNetwork } = useTargetNetwork();
  const color = useNetworkColor();
  return (
    <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-base-300 px-3 py-1 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {targetNetwork.name}
    </span>
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
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 border-b border-base-300 px-2 sm:px-4 gap-2">
      <div className="navbar-start w-auto gap-2">
        <details className="dropdown lg:hidden" ref={burgerMenuRef}>
          <summary className="btn btn-ghost btn-sm px-2" aria-label="Menu">
            <Bars3Icon className="h-5 w-5" />
          </summary>
          <ul
            className="menu menu-sm dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-56 border border-base-300"
            onClick={() => burgerMenuRef?.current?.removeAttribute("open")}
          >
            <MenuLink label="Dashboard" href="/" />
            <li className="menu-title">Developer</li>
            {developerLinks.map(link => (
              <MenuLink key={link.href} {...link} />
            ))}
          </ul>
        </details>
        <Link href="/" passHref className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-7 h-7">
            <Image alt="Hedera" className="dark:hidden" fill src="/Hedera-Icon-Dark.svg" />
            <Image alt="Hedera" className="hidden dark:block" fill src="/Hedera-Icon-White.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold leading-tight text-base">Tidepool</span>
            <span className="hidden sm:block text-[10px] tracking-wider uppercase text-base-content/50">
              SaucerSwap V2 vault on Hedera
            </span>
          </div>
        </Link>
        <ul className="hidden lg:flex menu menu-horizontal menu-sm px-1 gap-1 items-center ml-4">
          <MenuLink label="Dashboard" href="/" />
          <li>
            <details ref={devMenuRef}>
              <summary className="text-sm py-1.5 px-3 gap-1 after:hidden">
                Developer
                <ChevronDownIcon className="h-3 w-3" />
              </summary>
              <ul className="p-2 w-48 bg-base-100 border border-base-300 z-30">
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
  );
};
