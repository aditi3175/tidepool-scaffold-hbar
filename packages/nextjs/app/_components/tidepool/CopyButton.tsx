"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";

/** Copies `text` to the clipboard and confirms for two seconds. */
export const CopyButton = ({ text, label = "Copy" }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line px-2 text-xs text-muted hover:text-fg motion-safe:transition-colors motion-safe:duration-150"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-teal" aria-hidden />
      ) : (
        <ClipboardIcon className="h-4 w-4" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
};
