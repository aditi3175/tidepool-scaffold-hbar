"use client";

import { HeroEditorial } from "./HeroEditorial";
import { HeroGlass } from "./HeroGlass";
import { HeroPulse } from "./HeroPulse";
import { useHeroData } from "./useHeroData";

const DIRECTIONS = [
  { id: "a", label: "Premium fintech" },
  { id: "b", label: "Editorial" },
  { id: "c", label: "Crypto-native" },
];

const Divider = ({ id, label, note }: { id: string; label: string; note: string }) => (
  <div
    id={id}
    className="flex scroll-mt-16 items-center justify-between gap-4 bg-[#1a1a1a] px-6 py-2 text-xs text-white/70"
  >
    <span className="font-semibold text-white">{label}</span>
    <span className="hidden sm:inline">{note}</span>
  </div>
);

/** Three hero directions on live data, one after another, with a switcher. Mockups only: buttons do nothing. */
export const Heroes = () => {
  const d = useHeroData();
  return (
    <div className="relative flex-1">
      <Divider
        id="a"
        label="A · Premium fintech"
        note="Glass, gradients, the live chart as a floating card. Manrope."
      />
      <HeroGlass d={d} />
      <Divider
        id="b"
        label="B · Editorial / product launch"
        note="Light paper, oversized condensed type, a full-width price ruler. Archivo."
      />
      <HeroEditorial d={d} />
      <Divider
        id="c"
        label="C · Crypto-native"
        note="Vivid, dense, animated: live event ticker, flow chart, bento tiles. Space Grotesk."
      />
      <HeroPulse d={d} />

      <nav
        aria-label="Directions"
        className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full border border-white/15 bg-black/80 p-1 text-sm text-white shadow-2xl backdrop-blur-md"
      >
        {DIRECTIONS.map(dir => (
          <a key={dir.id} href={`#${dir.id}`} className="rounded-full px-4 py-2 hover:bg-white/10">
            <span className="font-semibold">{dir.id.toUpperCase()}</span>
            <span className="hidden sm:inline"> · {dir.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
};
