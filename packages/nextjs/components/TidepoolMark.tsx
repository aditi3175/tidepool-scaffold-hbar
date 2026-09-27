/** Tidepool mark: a small tide gauge (ruler ticks, a range band and the water line). Decorative; pair it with text. */
export const TidepoolMark = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
    <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" stroke="#1c2b38" fill="#0f1820" />
    <rect x="7" y="5" width="10" height="10" fill="#2dd4bf" fillOpacity="0.2" stroke="#2dd4bf" />
    <path d="M12 3.5v13" stroke="#e6edf3" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M3.5 18.5h17" stroke="#8a9bab" />
    <path d="M5 18.5v2M9 18.5v1.2M12 18.5v2M15 18.5v1.2M19 18.5v2" stroke="#8a9bab" />
  </svg>
);
