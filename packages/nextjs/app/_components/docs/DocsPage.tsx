import Link from "next/link";
import { DocsSidebar } from "~~/app/_components/docs/DocsSidebar";
import { Markdown } from "~~/app/_components/docs/Markdown";
import { type LoadedDoc, searchIndex } from "~~/app/_components/docs/load";
import { DOCS, docHref } from "~~/app/_components/docs/manifest";
import { Eyebrow } from "~~/components/pulse";
import { GITHUB_URL } from "~~/utils/tidepool/constants";

/** A docs page: sidebar with search, the article, an "On this page" list, and previous/next links. */
export const DocsPage = ({ doc }: { doc: LoadedDoc }) => {
  const index = searchIndex();
  const position = DOCS.findIndex(entry => entry.slug === doc.slug);
  const entry = DOCS[position];
  const previous = position > 0 ? DOCS[position - 1] : undefined;
  const next = position < DOCS.length - 1 ? DOCS[position + 1] : undefined;
  const source = `${GITHUB_URL}/blob/main/packages/nextjs/content/docs/${doc.file}`;

  return (
    <div className="relative isolate overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[360px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(0,245,160,0.08),transparent)]"
      />
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,1fr)_220px]">
        {/* Sidebar: a disclosure on small screens, a sticky column on large ones */}
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
          <details className="rounded-xl border border-white/10 bg-surface lg:hidden">
            <summary className="cursor-pointer px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">
              Docs menu
            </summary>
            <div className="border-t border-white/[0.06] p-3">
              <DocsSidebar index={index} />
            </div>
          </details>
          <div className="hidden lg:block">
            <DocsSidebar index={index} />
          </div>
        </aside>

        <article className="min-w-0 max-w-[760px]">
          <Eyebrow>{entry?.section ?? "Docs"}</Eyebrow>
          <h1 className="m-0 mt-4 text-[clamp(34px,4vw,48px)] font-bold leading-[1.05] tracking-[-0.03em] text-fg">
            {doc.title}
          </h1>
          <div className="mt-8">
            <Markdown body={doc.body} />
          </div>

          <nav
            aria-label="Previous and next page"
            className="mt-16 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-8"
          >
            {previous ? (
              <Link
                href={docHref(previous.slug)}
                className="group rounded-xl border border-white/10 bg-surface p-4 transition-colors hover:border-neon/40"
              >
                <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-faint">← Previous</span>
                <span className="mt-1 block font-bold text-fg group-hover:text-neon">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={docHref(next.slug)}
                className="group rounded-xl border border-white/10 bg-surface p-4 text-right transition-colors hover:border-neon/40"
              >
                <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Next →</span>
                <span className="mt-1 block font-bold text-fg group-hover:text-neon">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>

        <aside className="hidden xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto">
          {doc.headings.length > 0 && (
            <nav aria-label="On this page" className="text-sm">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">On this page</div>
              <ul className="m-0 flex list-none flex-col border-l border-white/[0.08] p-0">
                {doc.headings.map(heading => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className={`-ml-px block border-l border-transparent py-1.5 text-muted hover:border-neon hover:text-fg ${
                        heading.level === 3 ? "pl-7" : "pl-4"
                      }`}
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-neon"
          >
            Edit on GitHub ↗
          </a>
        </aside>
      </div>
    </div>
  );
};
