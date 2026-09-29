import Link from "next/link";

/** The mark: two stacked tide lines in the mint-to-cyan gradient. Decorative; the wordmark carries the name. */
export const LogoMark = ({ className = "h-5 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 32 20" className={className} fill="none" aria-hidden>
    <defs>
      <linearGradient id="tp-logo" x1="0" x2="32" y1="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2EE6C8" />
        <stop offset="1" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
    <path
      d="M2 8c3.5-4.5 7-4.5 10.5 0S19.5 12.5 23 8s5.5-4 7-2.5"
      stroke="url(#tp-logo)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M2 14.5c3.5-4.5 7-4.5 10.5 0s7 4.5 10.5 0 5.5-4 7-2.5"
      stroke="url(#tp-logo)"
      strokeOpacity="0.55"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

/** Mark and wordmark, linking home. */
export const Logo = ({ className = "" }: { className?: string }) => (
  <Link href="/" className={`inline-flex shrink-0 items-center gap-2.5 ${className}`} aria-label="Tidepool home">
    <LogoMark />
    <span className="text-[19px] font-bold tracking-[-0.02em] text-fg">tidepool</span>
  </Link>
);
