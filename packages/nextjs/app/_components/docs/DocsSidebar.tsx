"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS, docHref } from "~~/app/_components/docs/manifest";

type IndexEntry = { slug: string; title: string; headings: { id: string; text: string }[] };

const pad = (n: number) => String(n).padStart(2, "0");

/** The section in view: the last ## heading above the top third of the screen. */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  useEffect(() => {
    if (ids.length === 0) return;
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.3) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);
  return active;
}

/**
 * Docs navigation: search (Ctrl+K or /), the pages in reading order, and the current page's sections, with the one
 * in view highlighted.
 */
export const DocsSidebar = ({
  index,
  sections = [],
}: {
  index: IndexEntry[];
  sections?: { id: string; text: string }[];
}) => {
  const pathname = usePathname();
  const searchId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const ids = useMemo(() => sections.map(s => s.id), [sections]);
  const active = useActiveHeading(ids);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === input.current) {
        setQuery("");
        input.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: { href: string; label: string; page: string }[] = [];
    for (const page of index) {
      if (page.title.toLowerCase().includes(q)) hits.push({ href: docHref(page.slug), label: page.title, page: "" });
      for (const heading of page.headings) {
        if (heading.text.toLowerCase().includes(q)) {
          hits.push({ href: `${docHref(page.slug)}#${heading.id}`, label: heading.text, page: page.title });
        }
      }
    }
    return hits.slice(0, 12);
  }, [index, query]);

  return (
    <nav aria-label="Docs" className="flex flex-col gap-8 text-sm">
      <div>
        <label htmlFor={searchId} className="sr-only">
          Search the docs
        </label>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 transition-colors focus-within:border-neon/50">
          <input
            ref={input}
            id={searchId}
            type="search"
            placeholder="Search the docs"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint"
          />
          <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-faint lg:inline">
            Ctrl K
          </kbd>
        </div>
        {query.trim() && (
          <ul className="m-0 mt-2 flex list-none flex-col gap-0.5 p-0" aria-live="polite">
            {results.length === 0 ? (
              <li className="px-3 py-1.5 text-muted">No matches</li>
            ) : (
              results.map(hit => (
                <li key={hit.href}>
                  <Link
                    href={hit.href}
                    onClick={() => setQuery("")}
                    className="block rounded-lg px-3 py-1.5 text-fg hover:bg-white/[0.04]"
                  >
                    {hit.label}
                    {hit.page && <span className="block text-xs text-faint">{hit.page}</span>}
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Pages</div>
        <ol className="m-0 flex list-none flex-col p-0">
          {DOCS.map((doc, i) => {
            const href = docHref(doc.slug);
            const current = pathname === href;
            return (
              <li key={doc.slug}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`group flex items-baseline gap-3 border-l py-2 pl-4 transition-colors ${
                    current
                      ? "border-neon text-fg"
                      : "border-white/[0.08] text-muted hover:border-white/30 hover:text-fg"
                  }`}
                >
                  <span className={`font-mono text-[11px] ${current ? "text-neon" : "text-faint"}`}>{pad(i + 1)}</span>
                  <span className={current ? "font-semibold" : ""}>{doc.title}</span>
                </Link>
                {current && sections.length > 0 && (
                  <ol className="m-0 mb-2 flex list-none flex-col border-l border-white/[0.08] p-0">
                    {sections.map((s, j) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className={`-ml-px flex items-baseline gap-2.5 border-l py-1.5 pl-7 font-mono text-[12px] transition-colors ${
                            active === s.id ? "border-neon text-fg" : "border-transparent text-faint hover:text-muted"
                          }`}
                        >
                          <span className={active === s.id ? "text-neon" : ""}>{pad(j + 1)}</span>
                          <span className="font-sans text-[13px]">{s.text}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
