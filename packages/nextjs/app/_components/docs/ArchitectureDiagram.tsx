import type { ReactNode } from "react";

/**
 * How the pieces connect, drawn with HTML: the browser side on the left, Hedera testnet on the right, and the
 * transport between them in the middle. Replaces the text diagram on the site; the Markdown keeps the text version
 * for GitHub.
 */

const Mono = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${className}`}>{children}</span>
);

const Box = ({
  title,
  tag,
  children,
  strong = false,
  className = "",
}: {
  title: string;
  tag?: string;
  children?: ReactNode;
  strong?: boolean;
  className?: string;
}) => (
  <div
    className={`rounded-xl border p-4 ${strong ? "border-neon/45 bg-neon/[0.05]" : "border-white/10 bg-bg"} ${className}`}
  >
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span className={`whitespace-nowrap font-semibold ${strong ? "text-neon" : "text-fg"}`}>{title}</span>
      {tag && <Mono className="whitespace-nowrap text-faint">{tag}</Mono>}
    </div>
    {children && <div className="mt-2">{children}</div>}
  </div>
);

/** A labelled horizontal link between the columns (vertical on phones). */
const Link = ({ label, reverse = false }: { label: string; reverse?: boolean }) => (
  <div className="flex items-center justify-center py-1 md:py-0">
    <div className="flex w-full flex-col items-center gap-1.5 md:px-2">
      <Mono className="whitespace-nowrap text-muted">{label}</Mono>
      <div className={`hidden w-full items-center md:flex ${reverse ? "flex-row-reverse" : ""}`} aria-hidden>
        <span className="h-px flex-1 bg-neon/50" />
        <span
          className={`h-0 w-0 border-y-[5px] border-y-transparent ${reverse ? "border-r-[7px] border-r-neon/70" : "border-l-[7px] border-l-neon/70"}`}
        />
      </div>
      <span className="text-neon/70 md:hidden" aria-hidden>
        {reverse ? "↑" : "↓"}
      </span>
    </div>
  </div>
);

const Call = ({ name, detail }: { name: string; detail: string }) => (
  <li className="grid grid-cols-1 gap-0.5 border-t border-white/[0.06] py-2.5 first:border-t-0 first:pt-0 xl:grid-cols-[190px_minmax(0,1fr)] xl:gap-4">
    <span className="whitespace-nowrap font-mono text-[12.5px] text-neon">{name}</span>
    <span className="text-[13.5px] text-muted">{detail}</span>
  </li>
);

export const ArchitectureDiagram = () => (
  <figure className="my-8" aria-label="How Tidepool's pieces connect">
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/40">
      <div className="grid grid-cols-1 gap-3 p-5 sm:p-6 md:grid-cols-[minmax(0,0.75fr)_160px_minmax(0,1.9fr)] md:gap-x-0 md:gap-y-4">
        {/* Column heads */}
        <Mono className="hidden text-faint md:block">Your side</Mono>
        <span className="hidden md:block" />
        <Mono className="hidden text-faint md:block">Hedera testnet</Mono>

        {/* Row 1: dashboard → vault */}
        <Box title="Dashboard" tag="Next.js" className="md:self-start">
          <ul className="m-0 list-none space-y-1 p-0 text-[13.5px] text-muted">
            <li>Range chart</li>
            <li>Deposit / Withdraw</li>
            <li>Keeper</li>
            <li>Activity</li>
          </ul>
        </Box>
        <div className="md:self-start md:pt-6">
          <Link label="JSON-RPC · Hashio" />
        </div>
        <Box title="TidepoolVault" tag="Solidity · no owner" strong>
          <ul className="m-0 mt-1 list-none p-0">
            <Call
              name="HTS · 0x167"
              detail="Create, mint and burn the share token; associate token0, token1 and the LP NFT"
            />
            <Call name="Exchange rate · 0x168" detail="SaucerSwap's position fee, tinycents → tinybars" />
            <Call name="SaucerSwap V2 pool" detail="slot0 and observe: spot and TWAP" />
            <Call
              name="PositionManager"
              detail="mint, increase, decrease, collect. The position is an HTS NFT (0.0.1310436)"
            />
            <Call name="SwapRouter" detail="exactInputSingle, to swap to the range's ratio" />
          </ul>
        </Box>

        {/* Row 2: mirror node → dashboard */}
        <div className="hidden md:block" />
        <Link label="REST · activity" reverse />
        <Box title="Mirror node" tag="REST API">
          <span className="whitespace-nowrap font-mono text-[12.5px] text-muted">
            /api/v1/contracts/{"{vault}"}/results/logs
          </span>
        </Box>

        {/* Row 3: wallet → tokens */}
        <Box title="Wallet" tag="MetaMask etc." />
        <Link label="HIP-719 · ERC-20" />
        <Box title="Token facades" tag="HTS">
          <span className="text-[13.5px] text-muted">
            <code className="whitespace-nowrap font-mono text-[12.5px] text-fg">associate()</code> for HIP-719, ERC-20
            approvals, and{" "}
            <code className="whitespace-nowrap font-mono text-[12.5px] text-fg">WhbarHelper.deposit()</code> to wrap
            HBAR
          </span>
        </Box>
      </div>
    </div>
  </figure>
);
