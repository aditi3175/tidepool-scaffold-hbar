"use client";

import { type ReactNode, useState } from "react";
import { RangeChart } from "~~/components/ui3/RangeChart";
import { AmountInput, Button, KeyFigure, Panel, Pill, Tabs, Term, buttonClass } from "~~/components/ui3/primitives";
import { useVault } from "~~/hooks/tidepool/useVault";
import { formatAgo, formatPercent, formatPriceSig, formatToken } from "~~/utils/tidepool/format";
import { formatAmount, formatPrice, tickToPrice } from "~~/utils/tidepool/math";
import { TIDEPOOL_VAULTS } from "~~/utils/tidepool/vaults";

const MAIN = TIDEPOOL_VAULTS.find(vault => vault.id === "main") ?? TIDEPOOL_VAULTS[0];

const FONTS = {
  plex: { label: "IBM Plex Sans", family: "var(--font-plex), ui-sans-serif, system-ui, sans-serif" },
  instrument: { label: "Instrument Sans", family: "var(--font-instrument), ui-sans-serif, system-ui, sans-serif" },
} as const;
type FontId = keyof typeof FONTS;

const MONO = "var(--font-plex-mono), ui-monospace, monospace";

const SWATCHES = [
  { name: "ui-bg", hex: "#0B0D10", role: "Page" },
  { name: "ui-panel", hex: "#111419", role: "Panels (dashboard only)" },
  { name: "ui-raised", hex: "#171B21", role: "Hover, flags, popovers" },
  { name: "ui-line", hex: "#1E232B", role: "Hairlines" },
  { name: "ui-line-strong", hex: "#2A313B", role: "Control borders" },
  { name: "ui-fg", hex: "#E8EAED", role: "Text" },
  { name: "ui-muted", hex: "#8B93A1", role: "Labels, secondary text" },
  { name: "ui-faint", hex: "#5C6470", role: "Hints, disabled" },
  { name: "ui-accent", hex: "#3DD6A3", role: "Primary action, in range" },
  { name: "ui-warn", hex: "#E8A33D", role: "Out of range, paused" },
  { name: "ui-bad", hex: "#F0655A", role: "Errors" },
  { name: "ui-twap", hex: "#B8C0CC", role: "TWAP line (neutral)" },
];

const TYPE = [
  { size: "48 / 600", className: "text-[48px] leading-[1.08] font-semibold tracking-[-0.02em]", sample: "Display" },
  { size: "32 / 600", className: "text-[32px] leading-[1.15] font-semibold tracking-[-0.015em]", sample: "Page title" },
  { size: "20 / 500", className: "text-xl font-medium", sample: "Section title" },
  { size: "16 / 400", className: "text-base", sample: "Body text for explanations and docs." },
  { size: "14 / 400", className: "text-sm", sample: "UI text, buttons, table cells." },
  { size: "12 / 400", className: "text-xs text-ui-muted", sample: "Labels and captions" },
];

const NUMBER_ROWS: { what: string; raw: string; shown: string }[] = [
  { what: "Price", raw: "45.8653", shown: formatPriceSig(45.8653) },
  { what: "Price, small", raw: "0.0218036", shown: formatPriceSig(0.0218036) },
  { what: "Token amount", raw: "100.077332", shown: formatToken(100.077332) },
  { what: "Token amount, large", raw: "3,823.991766", shown: formatToken(3823.991766) },
  { what: "Token amount, compact", raw: "38,239.91766", shown: formatToken(38239.91766, { compact: true }) },
  { what: "Dust", raw: "0.0000412", shown: formatToken(0.0000412) },
  { what: "Fee tier", raw: "3000 (hundredths of a bip)", shown: formatPercent(0.3) },
  { what: "Time", raw: "1790000000 (unix)", shown: "3h ago" },
  { what: "Liquidity", raw: "207,550,896,151", shown: "Hidden (Details only)" },
];

// Sample states on the testnet pool's scale (WHBAR/SAUCE, +/-600 ticks).
const L = 43.4327;
const U = 48.9699;
const UNIT = "SAUCE per WHBAR";

const Section = ({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) => (
  <section id={id} className="border-t border-ui-line py-12">
    <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="m-0 text-xl font-medium leading-7 text-ui-fg">{title}</h2>
      {note && <p className="text-sm text-ui-muted">{note}</p>}
    </div>
    {children}
  </section>
);

const Caption = ({ children }: { children: ReactNode }) => <p className="mb-3 text-xs text-ui-muted">{children}</p>;

const LiveChart = () => {
  const vault = useVault(MAIN);
  const { tickLower, tickUpper, spotTick, twapTick, decimals0, decimals1, symbol0, symbol1 } = vault;
  const ready =
    tickLower !== undefined &&
    tickUpper !== undefined &&
    spotTick !== undefined &&
    twapTick !== undefined &&
    decimals0 !== undefined &&
    decimals1 !== undefined;
  const p = (tick: number) => tickToPrice(tick, decimals0!, decimals1!);
  const apart = ready ? Math.abs(spotTick! - twapTick!) : 0;
  return (
    <RangeChart
      loading={!ready}
      lower={ready ? p(tickLower!) : undefined}
      upper={ready ? p(tickUpper!) : undefined}
      spot={ready ? p(spotTick!) : undefined}
      twap={ready ? p(twapTick!) : undefined}
      inRange={vault.inRange}
      paused={vault.maxTwapDeviation !== undefined && apart > vault.maxTwapDeviation}
      unit={symbol0 && symbol1 ? `${symbol1} per ${symbol0}` : undefined}
      height={200}
    />
  );
};

export const UiLab = () => {
  const [font, setFont] = useState<FontId>("plex");
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  return (
    <div className="flex-1 bg-ui-bg text-ui-fg antialiased" style={{ fontFamily: FONTS[font].family }}>
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-24 sm:px-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-end justify-between gap-6 py-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ui-muted">Dev only · in review</p>
            <h1 className="m-0 mt-2 text-[32px] font-semibold leading-[1.15] tracking-[-0.015em]">UI v3 style sheet</h1>
            <p className="mt-3 max-w-xl text-base text-ui-muted">
              Tokens, type, controls, number rules and the range chart for the next Tidepool UI. Nothing here is used by
              the site yet.
            </p>
          </div>
          <div>
            <Caption>Typeface</Caption>
            <div className="inline-flex rounded-lg border border-ui-line-strong p-0.5">
              {(Object.keys(FONTS) as FontId[]).map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFont(id)}
                  aria-pressed={font === id}
                  className={`h-8 cursor-pointer rounded-md px-3 text-sm ${
                    font === id ? "bg-ui-raised text-ui-fg" : "text-ui-muted hover:text-ui-fg"
                  }`}
                >
                  {FONTS[id].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 1. The signature */}
        <Section id="chart" title="Range chart" note="The one visual idea, used on the landing page and the dashboard.">
          <div className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Caption>Live · main vault on Hedera testnet</Caption>
              <LiveChart />
            </div>
            <div>
              <Caption>In range</Caption>
              <RangeChart lower={L} upper={U} spot={45.8653} twap={45.8653} unit={UNIT} />
            </div>
            <div>
              <Caption>Out of range (price above the range)</Caption>
              <RangeChart lower={L} upper={U} spot={50.1593} twap={50.1593} unit={UNIT} />
            </div>
            <div>
              <Caption>Paused: spot and TWAP more than 50 ticks apart</Caption>
              <RangeChart lower={L} upper={U} spot={48.1927} twap={46.3031} paused unit={UNIT} />
            </div>
            <div>
              <Caption>After a rebalance: previous range dotted</Caption>
              <RangeChart
                lower={47.2384}
                upper={53.2609}
                spot={50.1593}
                twap={50.1593}
                previous={{ lower: L, upper: U }}
                unit={UNIT}
              />
            </div>
            <div>
              <Caption>Loading</Caption>
              <RangeChart loading unit={UNIT} />
            </div>
          </div>
        </Section>

        {/* 2. Dashboard header */}
        <Section id="figures" title="Key figures" note="Sample values. The dashboard's header row.">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="m-0 text-xl font-medium">WHBAR / SAUCE</h3>
            <span className="text-sm text-ui-muted">0.30%</span>
            <Pill tone="accent">In range</Pill>
            <button type="button" className={`${buttonClass("secondary")} ml-auto h-8 text-sm`}>
              Main vault
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6 border-t border-ui-line pt-6 sm:grid-cols-5">
            <KeyFigure label="Vault value" value="8,414 SAUCE" sub="≈ 183.4 WHBAR" />
            <KeyFigure label="Share price" value="1.0027" sub="WHBAR-equivalent" />
            <KeyFigure label="Fees collected" value="2.27 SAUCE" sub="+ 0.0476 WHBAR · last 50 events" />
            <KeyFigure label="Last compound" value={formatAgo(Date.now() / 1000 - 3 * 3600)} />
            <KeyFigure label="Last rebalance" value={formatAgo(Date.now() / 1000 - 26 * 3600)} />
          </div>
        </Section>

        {/* 3. Controls */}
        <Section id="controls" title="Controls" note="36px tall, 8px radius, three variants.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Deposit</Button>
            <Button variant="secondary">Withdraw</Button>
            <Button variant="ghost">Cancel</Button>
            <Button disabled>Enter an amount</Button>
            <Button loading>Confirm in wallet</Button>
            <a href="#controls" className="text-sm text-ui-accent hover:underline">
              View on HashScan ↗
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Pill tone="accent">In range</Pill>
            <Pill tone="warn">Out of range</Pill>
            <Pill tone="warn">Paused</Pill>
            <Pill tone="bad">TWAP unavailable</Pill>
            <Pill tone="neutral">No position</Pill>
          </div>
          <div className="mt-8 max-w-2xl text-base leading-7 text-ui-muted">
            Definitions sit on the term itself instead of a &ldquo;?&rdquo; icon: the vault acts on the{" "}
            <Term definition="The pool's average price over the last 10 minutes. The vault acts on this, not on the live price, so one large trade cannot steer it.">
              TWAP
            </Term>
            , and anyone can{" "}
            <Term definition="Collect the position's swap fees and add them, with any idle tokens, back into the position.">
              compound
            </Term>{" "}
            while it is inside the{" "}
            <Term definition="The two prices between which the vault's liquidity is active and earns fees.">range</Term>
            .
          </div>
        </Section>

        {/* 4. Action panel */}
        <Section id="panel" title="Action panel" note="The one card style. Dashboard only.">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_380px]">
            <Panel title="Your position">
              <div className="grid grid-cols-2 gap-6">
                <KeyFigure label="Your share" value={formatPercent(1.98)} sub="2.0000 shares of 101.01" />
                <KeyFigure label="Value" value="166.6 SAUCE" sub="≈ 3.63 WHBAR" />
                <KeyFigure label="WHBAR" value={formatToken(1.981773)} />
                <KeyFigure label="SAUCE" value={formatToken(75.72261)} />
              </div>
            </Panel>
            <Panel>
              <Tabs
                items={[
                  { id: "deposit", label: "Deposit" },
                  { id: "withdraw", label: "Withdraw" },
                ]}
                value={tab}
                onChange={setTab}
              />
              <div className="mt-5 flex flex-col gap-4">
                {tab === "deposit" ? (
                  <>
                    <AmountInput label="WHBAR" token="WHBAR" balance="12.5" defaultValue="1.00" />
                    <AmountInput
                      label="SAUCE"
                      token="SAUCE"
                      balance="38.2"
                      defaultValue="45.87"
                      error="More than your balance"
                    />
                    <p className="text-xs leading-5 text-ui-muted">
                      You receive about <span className="tabular-nums text-ui-fg">0.9973</span> shares. Amounts follow
                      the vault&apos;s current ratio.
                    </p>
                    <Button full disabled>
                      Not enough SAUCE
                    </Button>
                  </>
                ) : (
                  <>
                    <AmountInput label="Shares" token="shares" balance="2.0000" />
                    <Button full variant="secondary">
                      Withdraw
                    </Button>
                  </>
                )}
              </div>
            </Panel>
          </div>
        </Section>

        {/* 5. Tables */}
        <Section
          id="table"
          title="Tables"
          note="Activity and on-chain evidence. Hairlines, no zebra, right-aligned numbers."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ui-line text-left text-xs text-ui-muted">
                  <th className="py-2.5 pr-4 font-normal">Action</th>
                  <th className="py-2.5 pr-4 text-right font-normal">Gas used</th>
                  <th className="py-2.5 pr-4 font-normal">When</th>
                  <th className="py-2.5 text-right font-normal">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["initialize", "5,240,000", "Sep 22"],
                  ["compound (first, opens the position)", "890,000", "Sep 22"],
                  ["compound", "560,000", "Sep 24"],
                  ["rebalance", "980,000", "Sep 27"],
                  ["withdraw", "340,000", "Sep 27"],
                ].map(([action, gas, when]) => (
                  <tr key={action} className="border-b border-ui-line">
                    <td className="py-3 pr-4 text-ui-fg">{action}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{gas}</td>
                    <td className="py-3 pr-4 text-ui-muted">{when}</td>
                    <td className="py-3 text-right">
                      <span className="text-ui-accent" style={{ fontFamily: MONO }}>
                        0.0.51…4471 ↗
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ui-faint">Sample rows. Gas figures from AGENTS.md; links are placeholders.</p>
        </Section>

        {/* 6. Numbers */}
        <Section id="numbers" title="Number rules" note="One helper, everywhere. Full precision on hover.">
          <table className="w-full max-w-2xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-ui-line text-left text-xs text-ui-muted">
                <th className="py-2.5 pr-4 font-normal">Kind</th>
                <th className="py-2.5 pr-4 font-normal">From the contract</th>
                <th className="py-2.5 text-right font-normal">Shown</th>
              </tr>
            </thead>
            <tbody>
              {NUMBER_ROWS.map(row => (
                <tr key={row.what} className="border-b border-ui-line">
                  <td className="py-3 pr-4 text-ui-muted">{row.what}</td>
                  <td className="py-3 pr-4 text-ui-faint" style={{ fontFamily: MONO }}>
                    {row.raw}
                  </td>
                  <td className="py-3 text-right tabular-nums text-ui-fg">{row.shown}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-ui-faint">
            Today&apos;s UI for comparison:{" "}
            <span style={{ fontFamily: MONO }}>
              {formatPrice(45.8653)} · {formatAmount(3823991766n, 6)}
            </span>
          </p>
        </Section>

        {/* 7. Type */}
        <Section id="type" title="Type" note={`${FONTS[font].label}, six sizes. Mono only for code and addresses.`}>
          <div className="flex flex-col divide-y divide-ui-line">
            {TYPE.map(t => (
              <div key={t.size} className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-6 py-4">
                <span className="text-xs tabular-nums text-ui-faint">{t.size}</span>
                <span className={t.className}>{t.sample}</span>
              </div>
            ))}
            <div className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-6 py-4">
              <span className="text-xs text-ui-faint">Mono</span>
              <code className="text-sm text-ui-fg" style={{ fontFamily: MONO }}>
                npm create scaffold-hbar@latest -- --template aditi3175/tidepool-scaffold-hbar
              </code>
            </div>
            <div className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-6 py-4">
              <span className="text-xs text-ui-faint">Figures</span>
              <span className="text-xl tabular-nums">1,234.56 · 45.87 · 0.02180 · 101.01</span>
            </div>
          </div>
        </Section>

        {/* 8. Palette */}
        <Section id="palette" title="Palette" note="Graphite neutrals, one accent, two states. TWAP is neutral.">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
            {SWATCHES.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span
                  className="h-10 w-10 shrink-0 rounded-lg border border-ui-line-strong"
                  style={{ background: s.hex }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="text-sm text-ui-fg">{s.role}</div>
                  <div className="text-xs text-ui-faint" style={{ fontFamily: MONO }}>
                    {s.hex}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
};
