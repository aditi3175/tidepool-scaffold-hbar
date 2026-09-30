import { useEffect, useState } from "react";
import { deserialize, serialize } from "wagmi";

/**
 * The last values the dashboard read, kept in this browser (localStorage) so a return visit can show them at once
 * while fresh reads run. Only ever used as react-query `placeholderData`: nothing reads it as current state, and a
 * missing or unreadable snapshot just means the normal loading placeholder. bigint-safe via wagmi's serializer.
 */
const PREFIX = "tidepool.snapshot.";

export function writeSnapshot(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, serialize(value));
  } catch {
    // storage full or blocked: skip
  }
}

/** The stored snapshot, loaded after mount (so the server render and the first client render match). */
export function useSnapshot<T>(key: string): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      setValue(raw ? (deserialize(raw) as T) : undefined);
    } catch {
      setValue(undefined);
    }
  }, [key]);
  return value;
}
