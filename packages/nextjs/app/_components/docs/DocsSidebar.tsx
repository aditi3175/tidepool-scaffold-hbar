"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS, docHref } from "~~/app/_components/docs/manifest";

type IndexEntry = { slug: string; title: string; headings: { id: string; text: string }[] };

/** Docs navigation: a search box over page titles and headings, then the pages grouped by section. */
export const DocsSidebar = ({ index }: { index: IndexEntry[] }) => {
  const pathname = usePathname();
  const searchId = useId();
  const [query, setQuery] = useState("");

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

  const sections = [...new Set(DOCS.map(doc => doc.section))];

  return (
    <nav aria-label="Docs" className="flex flex-col gap-6 text-sm">
      <div>
        <label htmlFor={searchId} className="sr-only">
          Search the docs
        </label>
        <input
          id={searchId}
          type="search"
          placeholder="Search the docs"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted"
        />
        {query.trim() && (
          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0" aria-live="polite">
            {results.length === 0 ? (
              <li className="px-2 py-1 text-muted">No matches</li>
            ) : (
              results.map(hit => (
                <li key={hit.href}>
                  <Link
                    href={hit.href}
                    onClick={() => setQuery("")}
                    className="block rounded-lg px-2 py-1 text-fg hover:bg-raised"
                  >
                    {hit.label}
                    {hit.page && <span className="block text-xs text-muted">{hit.page}</span>}
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {sections.map(section => (
        <div key={section}>
          <div className="mb-2 px-2 text-xs font-medium text-muted">{section}</div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {DOCS.filter(doc => doc.section === section).map(doc => {
              const href = docHref(doc.slug);
              const active = pathname === href;
              return (
                <li key={doc.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-2 py-1 ${active ? "bg-raised text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};
