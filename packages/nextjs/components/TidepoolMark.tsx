/** Tidepool mark: a pool with a concentrated band of liquidity. Decorative; pair it with a text label. */
export const TidepoolMark = ({ className = "h-7 w-7" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
    <defs>
      <linearGradient id="tp-mark-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#b9b2ff" />
        <stop offset="1" stopColor="#6e7bff" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="15" stroke="rgb(255 255 255 / 0.14)" />
    <path
      d="M4.5 18.5c3-2.4 5.6-2.4 8.2 0s5.4 2.4 8 0 5-2.4 6.8-.8"
      stroke="url(#tp-mark-fill)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 23c2.4-1.6 4.4-1.6 6.6 0s4.4 1.6 6.6 0 4-1.6 5.4-.6"
      stroke="rgb(62 224 197 / 0.6)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="16" cy="10" r="2.2" fill="url(#tp-mark-fill)" />
  </svg>
);
