"use client";

import { type ButtonHTMLAttributes, type ReactNode, useId, useState } from "react";

/** UI v3 primitives. One radius per role (8px controls, 12px panels), one control height (36px). */

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-ui-accent text-ui-accent-ink hover:brightness-110 disabled:bg-ui-raised disabled:text-ui-faint",
  secondary:
    "border border-ui-line-strong text-ui-fg hover:bg-ui-raised disabled:text-ui-faint disabled:hover:bg-transparent",
  ghost: "text-ui-muted hover:bg-ui-raised hover:text-ui-fg disabled:text-ui-faint disabled:hover:bg-transparent",
};

export const buttonClass = (variant: ButtonVariant = "primary", full = false) =>
  `inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed ${
    full ? "w-full" : ""
  } ${BUTTON[variant]}`;

export const Button = ({
  variant = "primary",
  full = false,
  loading = false,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; full?: boolean; loading?: boolean }) => (
  <button
    type="button"
    {...rest}
    disabled={rest.disabled || loading}
    aria-busy={loading || undefined}
    className={`${buttonClass(variant, full)} ${className}`}
  >
    {loading && (
      <span
        className="h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        aria-hidden
      />
    )}
    {children}
  </button>
);

type Tone = "accent" | "warn" | "bad" | "neutral";
const PILL: Record<Tone, string> = {
  accent: "text-ui-accent bg-ui-accent/10",
  warn: "text-ui-warn bg-ui-warn/10",
  bad: "text-ui-bad bg-ui-bad/10",
  neutral: "text-ui-muted bg-ui-raised",
};

/** Status, as a dot and a word. */
export const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium ${PILL[tone]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
    {children}
  </span>
);

/** A term with its definition on hover or focus (a dotted underline instead of a "?" icon). */
export const Term = ({ children, definition }: { children: ReactNode; definition: ReactNode }) => {
  const id = useId();
  return (
    <span className="group relative inline-block">
      <button
        type="button"
        aria-describedby={id}
        className="cursor-help underline decoration-ui-faint decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:decoration-ui-fg"
      >
        {children}
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border border-ui-line-strong bg-ui-raised p-3 text-left text-xs font-normal leading-5 text-ui-fg opacity-0 shadow-[0_8px_24px_rgb(0_0_0/0.4)] transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {definition}
      </span>
    </span>
  );
};

/** A key figure: small muted label, larger value, optional sub-line. */
export const KeyFigure = ({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) => (
  <div className="min-w-0">
    <div className="text-xs text-ui-muted">{label}</div>
    <div className="mt-1 truncate text-xl font-medium tabular-nums text-ui-fg">{value}</div>
    {sub && <div className="mt-0.5 truncate text-xs text-ui-faint">{sub}</div>}
  </div>
);

/** A panel: the one card style (dashboard only; marketing pages use whitespace and hairlines instead). */
export const Panel = ({
  title,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`rounded-xl border border-ui-line bg-ui-panel p-5 ${className}`}>
    {(title || actions) && (
      <header className="mb-4 flex items-center justify-between gap-3">
        {title && <h3 className="m-0 text-sm font-medium leading-5 text-ui-muted">{title}</h3>}
        {actions}
      </header>
    )}
    {children}
  </section>
);

/** An amount field with the token as a suffix, an optional Max, and an error line. */
export const AmountInput = ({
  label,
  token,
  balance,
  error,
  defaultValue = "",
}: {
  label: string;
  token: string;
  balance?: string;
  error?: string;
  defaultValue?: string;
}) => {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <label htmlFor={id} className="text-ui-muted">
          {label}
        </label>
        {balance && <span className="tabular-nums text-ui-faint">Balance {balance}</span>}
      </div>
      <div
        className={`flex h-11 items-center gap-2 rounded-lg border bg-ui-bg px-3 focus-within:border-ui-muted ${
          error ? "border-ui-bad/70" : "border-ui-line-strong"
        }`}
      >
        <input
          id={id}
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={e => setValue(e.target.value)}
          aria-invalid={!!error || undefined}
          className="min-w-0 flex-1 bg-transparent text-base tabular-nums text-ui-fg outline-none placeholder:text-ui-faint"
        />
        {balance && (
          <button
            type="button"
            onClick={() => setValue(balance.replace(/,/g, ""))}
            className="cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-medium text-ui-accent hover:bg-ui-raised"
          >
            Max
          </button>
        )}
        <span className="text-sm text-ui-muted">{token}</span>
      </div>
      {error && <p className="mt-1.5 text-xs text-ui-bad">{error}</p>}
    </div>
  );
};

/** Tabs as an underlined row (no filled pills). */
export const Tabs = <T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) => (
  <div role="tablist" className="flex gap-5 border-b border-ui-line">
    {items.map(item => (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={value === item.id}
        onClick={() => onChange(item.id)}
        className={`-mb-px cursor-pointer border-b-2 pb-2.5 text-sm font-medium transition-colors duration-150 ${
          value === item.id ? "border-ui-fg text-ui-fg" : "border-transparent text-ui-muted hover:text-ui-fg"
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
);
