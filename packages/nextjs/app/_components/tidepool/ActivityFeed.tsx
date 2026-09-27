import { type ComponentType, type ReactNode, type SVGProps, useEffect, useRef } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  FlagIcon,
} from "@heroicons/react/20/solid";
import { type RangeHighlight, useInViewOnce, useSetRangeHighlight } from "~~/app/_components/tidepool/motion";
import { ExternalLink, Skeleton } from "~~/app/_components/tidepool/ui";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { ACTIVITY_LIMIT, type VaultEvent, useVaultActivity } from "~~/hooks/tidepool/useVaultActivity";
import { SHARE_DECIMALS } from "~~/utils/tidepool/constants";
import { hashscan } from "~~/utils/tidepool/hashscan";
import { formatAmount, shortAddress } from "~~/utils/tidepool/math";

const LABELS: Record<string, string> = {
  Initialized: "Vault initialized",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  FeesCollected: "Fees collected",
  Compound: "Compound",
  Rebalance: "Rebalance",
};

const ICONS: Record<string, { Icon: ComponentType<SVGProps<SVGSVGElement>>; tone: string }> = {
  Initialized: { Icon: FlagIcon, tone: "text-base-content/60 bg-white/[0.05] border-white/10" },
  Deposit: { Icon: ArrowDownTrayIcon, tone: "text-success bg-success/10 border-success/20" },
  Withdraw: { Icon: ArrowUpTrayIcon, tone: "text-base-content/75 bg-white/[0.05] border-white/10" },
  FeesCollected: { Icon: BanknotesIcon, tone: "text-secondary bg-secondary/10 border-secondary/20" },
  Compound: { Icon: ArrowPathIcon, tone: "text-accent bg-primary/10 border-primary/25" },
  Rebalance: { Icon: ArrowsRightLeftIcon, tone: "text-warning bg-warning/10 border-warning/20" },
};

const big = (value: unknown) => (typeof value === "bigint" ? value : undefined);

function describe(event: VaultEvent, vault: VaultState): ReactNode {
  const { symbol0, symbol1, decimals0, decimals1 } = vault;
  const a = event.args;
  const tokens = (x: unknown, y: unknown) =>
    `${formatAmount(big(x), decimals0)} ${symbol0 ?? ""} + ${formatAmount(big(y), decimals1)} ${symbol1 ?? ""}`;
  switch (event.name) {
    case "Deposit":
      return `${tokens(a.amount0, a.amount1)} in, ${formatAmount(big(a.shares), SHARE_DECIMALS)} shares to ${shortAddress(String(a.receiver))}`;
    case "Withdraw":
      return `${formatAmount(big(a.shares), SHARE_DECIMALS)} shares burned, ${tokens(a.amount0, a.amount1)} to ${shortAddress(String(a.receiver))}`;
    case "FeesCollected":
      return tokens(a.fee0, a.fee1);
    case "Compound":
      return `${tokens(a.amount0, a.amount1)} added (liquidity +${formatAmount(big(a.liquidityAdded), 0)}) by ${shortAddress(String(a.caller))}`;
    case "Rebalance": {
      const opened = a.oldTickLower === 0 && a.oldTickUpper === 0;
      const range = opened
        ? `position opened at [${a.newTickLower}, ${a.newTickUpper})`
        : `[${a.oldTickLower}, ${a.oldTickUpper}) → [${a.newTickLower}, ${a.newTickUpper})`;
      return `${range}, TWAP tick ${a.twapTick}, LP NFT #${String(a.newPositionSerial)}, by ${shortAddress(String(a.caller))}`;
    }
    case "Initialized":
      return `share token ${shortAddress(String(a.shareToken))}`;
    default:
      return null;
  }
}

/** The ranges a Rebalance event recorded (old range is 0,0 when the event opened the first position). */
function rangesOf(event: VaultEvent): RangeHighlight {
  if (event.name !== "Rebalance") return null;
  const a = event.args;
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : undefined);
  const newLower = num(a.newTickLower);
  const newUpper = num(a.newTickUpper);
  if (newLower === undefined || newUpper === undefined) return null;
  const oldLower = num(a.oldTickLower);
  const oldUpper = num(a.oldTickUpper);
  const opened = oldLower === 0 && oldUpper === 0;
  return {
    newLower,
    newUpper,
    oldLower: opened ? undefined : oldLower,
    oldUpper: opened ? undefined : oldUpper,
  };
}

const DOT: Record<string, string> = {
  Initialized: "bg-base-content/50",
  Deposit: "bg-success",
  Withdraw: "bg-base-content/70",
  FeesCollected: "bg-secondary",
  Compound: "bg-[#8fa3ff]",
  Rebalance: "bg-warning",
};

/** Every loaded event on one axis at its real timestamp, oldest on the left; hover a marker for what it was. */
const TimeAxis = ({ events }: { events: VaultEvent[] }) => {
  const first = events[events.length - 1].timestamp;
  const last = events[0].timestamp;
  const span = Math.max(1, last - first);
  const x = (t: number) => 2 + ((t - first) / span) * 96;
  const lanes = ["Deposit", "Withdraw", "FeesCollected", "Compound", "Rebalance"];
  return (
    <div className="mt-10">
      <div className="relative h-28">
        <span className="absolute inset-x-0 bottom-6 h-px bg-white/[0.1]" aria-hidden />
        {events.map(event => {
          const lane = Math.max(0, lanes.indexOf(event.name));
          return (
            <a
              key={`${event.transactionHash}-${event.logIndex}`}
              href={hashscan.tx(event.transactionHash)}
              target="_blank"
              rel="noreferrer"
              className="group absolute -translate-x-1/2"
              style={{ left: `${x(event.timestamp)}%`, bottom: `${1.5 + lane * 0.8}rem` }}
              title={`${LABELS[event.name] ?? event.name} · ${new Date(event.timestamp * 1000).toLocaleString()}`}
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full ring-2 ring-[#07080b] transition-transform duration-200 group-hover:scale-150 ${
                  DOT[event.name] ?? "bg-base-content/50"
                }`}
              />
            </a>
          );
        })}
      </div>
      <div className="tp-num flex justify-between text-[11px] text-base-content/40">
        <span>{new Date(first * 1000).toLocaleString()}</span>
        <span>{new Date(last * 1000).toLocaleString()}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-base-content/50">
        {lanes.map(name => (
          <span key={name} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${DOT[name]}`} aria-hidden />
            {LABELS[name] ?? name}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Events grouped by local calendar day, newest first (the mirror node returns them newest first). */
function groupByDay(events: VaultEvent[]): { day: string; events: VaultEvent[] }[] {
  const groups: { day: string; events: VaultEvent[] }[] = [];
  for (const event of events) {
    const day = new Date(event.timestamp * 1000).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}

/** The vault's recent events from the Hedera mirror node, with amounts and HashScan links. */
export const ActivityFeed = ({ vault }: { vault: VaultState }) => {
  const { data: events, isLoading, error } = useVaultActivity(vault.address, vault.abi);
  const setHighlight = useSetRangeHighlight();
  const [revealRef, revealed] = useInViewOnce<HTMLElement>();
  // Rows already shown. Null until the first load, so the initial list never animates; later arrivals slide in once.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!events) return;
    if (!seen.current) seen.current = new Set();
    for (const event of events) seen.current.add(`${event.transactionHash}-${event.logIndex}`);
  }, [events]);
  const isNew = (key: string) => seen.current !== null && !seen.current.has(key);
  const hasRebalance = Boolean(events?.some(event => event.name === "Rebalance"));

  const fees = events?.filter(event => event.name === "FeesCollected") ?? [];
  const fee0 = fees.reduce((sum, event) => sum + (big(event.args.fee0) ?? 0n), 0n);
  const fee1 = fees.reduce((sum, event) => sum + (big(event.args.fee1) ?? 0n), 0n);

  return (
    <section ref={revealRef} aria-label="Timeline" className={`tp-reveal ${revealed ? "tp-shown" : ""}`}>
      <header className="flex flex-wrap items-end justify-between gap-6 border-t border-white/[0.08] pt-10">
        <div>
          <h2 className="tp-display m-0 text-[2.1rem] leading-[1.05] sm:text-5xl">Timeline</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-base-content/55">
            The vault&apos;s last {ACTIVITY_LIMIT} events, from the Hedera mirror node.
            {hasRebalance ? " Hover a rebalance to see its ranges on the range chart." : ""}
          </p>
        </div>
        {fees.length > 0 && (
          <div className="text-left text-xs sm:text-right">
            <div className="tp-eyebrow">Fees collected in these events</div>
            <div className="tp-num mt-1 text-base-content/85">
              {formatAmount(fee0, vault.decimals0)} {vault.symbol0} + {formatAmount(fee1, vault.decimals1)}{" "}
              {vault.symbol1}
            </div>
          </div>
        )}
      </header>
      {events && events.length > 1 && <TimeAxis events={events} />}
      <div className="mt-10">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-error">Could not load activity: {error.message}</p>
        ) : !events?.length ? (
          <p className="tp-inset px-4 py-6 text-center text-sm text-base-content/50">No activity yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {groupByDay(events).map(group => (
              <section key={group.day} aria-label={group.day}>
                <h3 className="tp-eyebrow m-0 mb-3">{group.day}</h3>
                <ol className="flex flex-col divide-y divide-white/[0.05] border-y border-white/[0.06]">
                  {group.events.map(event => {
                    const { Icon, tone } = ICONS[event.name] ?? ICONS.Initialized;
                    return (
                      <li
                        key={`${event.transactionHash}-${event.logIndex}`}
                        className={`tp-card grid grid-cols-[2rem_1fr] gap-x-3 gap-y-1 border border-transparent px-3.5 py-3 hover:bg-white/[0.025] sm:grid-cols-[2rem_8.5rem_1fr_auto] sm:items-center sm:gap-x-4 ${
                          isNew(`${event.transactionHash}-${event.logIndex}`) ? "tp-enter" : ""
                        } ${event.name === "Rebalance" ? "cursor-default focus-within:bg-white/[0.025]" : ""}`}
                        onMouseEnter={event.name === "Rebalance" ? () => setHighlight(rangesOf(event)) : undefined}
                        onMouseLeave={event.name === "Rebalance" ? () => setHighlight(null) : undefined}
                        onFocus={event.name === "Rebalance" ? () => setHighlight(rangesOf(event)) : undefined}
                        onBlur={event.name === "Rebalance" ? () => setHighlight(null) : undefined}
                      >
                        <span
                          className={`tp-nudge row-span-2 flex h-8 w-8 items-center justify-center rounded-full border sm:row-span-1 ${tone}`}
                          aria-hidden
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex items-baseline justify-between gap-3 sm:block">
                          <span className="text-sm font-medium">{LABELS[event.name] ?? event.name}</span>
                          <span className="tp-num text-[11px] text-base-content/40 sm:hidden">
                            {new Date(event.timestamp * 1000).toLocaleTimeString()}
                          </span>
                        </span>
                        <span className="tp-num col-start-2 min-w-0 break-words text-xs leading-relaxed text-base-content/60 sm:col-start-auto">
                          {describe(event, vault)}
                        </span>
                        <ExternalLink
                          className="tp-num col-start-2 text-[11px] text-base-content/45 sm:col-start-auto sm:justify-self-end"
                          href={hashscan.tx(event.transactionHash)}
                        >
                          <span className="hidden sm:inline">
                            {new Date(event.timestamp * 1000).toLocaleTimeString()}
                          </span>
                          <span className="sm:hidden">HashScan</span>
                        </ExternalLink>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
