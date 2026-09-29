import type { CSSProperties } from "react";
import Link from "next/link";
import { DocsSidebar } from "~~/app/_components/docs/DocsSidebar";
import { Markdown } from "~~/app/_components/docs/Markdown";
import { type LoadedDoc, searchIndex } from "~~/app/_components/docs/load";
import { DOCS, docHref } from "~~/app/_components/docs/manifest";
import { GradientText } from "~~/components/pulse";
import { GITHUB_URL } from "~~/utils/tidepool/constants";

const delay = (ms: number) => ({ "--d": ms }) as CSSProperties;

/** The docs home's summary of the vault, from the Introduction's own facts. */
const FACTS = [
  { k: "One position", v: "The vault owns a single SaucerSwap V2 position. Depositors hold an HTS share token." },
  { k: "No owner", v: "No admin key, no pause, no fee switch and no upgrade path." },
  { k: "Anyone can call it", v: "compound() and rebalance() are permissionless. The contract checks every rule." },
  { k: "Guarded by the TWAP", v: "Nothing moves while spot is more than 50 ticks from the 10-minute average." },
];

/** A docs page: sidebar with search and the page's sections, the article, and previous/next links. */
export const DocsPage = ({ doc }: { doc: LoadedDoc }) => {
  const index = searchIndex();
  const position = DOCS.findIndex(entry => entry.slug === doc.slug);
  const entry = DOCS[position];
  const previous = position > 0 ? DOCS[position - 1] : undefined;
  const next = position < DOCS.length - 1 ? DOCS[position + 1] : undefined;
  const source = `${GITHUB_URL}/blob/main/packages/nextjs/content/docs/${doc.file}`;
  const sections = doc.headings.filter(h => h.level === 2).map(h => ({ id: h.id, text: h.text }));
  const home = doc.slug === "introduction";

  return (
    <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-10 px-5 pt-10 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16 lg:px-12">
      {/* Sidebar: a disclosure on small screens, a sticky column on large ones */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pb-8">
        <details className="rounded-xl border border-white/10 bg-surface lg:hidden">
          <summary className="cursor-pointer px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">
            {String(position + 1).padStart(2, "0")} · {doc.title}
          </summary>
          <div className="border-t border-white/[0.06] p-4">
            <DocsSidebar index={index} sections={sections} />
          </div>
        </details>
        <div className="hidden lg:block">
          <DocsSidebar index={index} sections={sections} />
        </div>
      </aside>

      <article className="min-w-0 max-w-[960px] lg:pl-14">
        <div className="tp-in font-mono text-[11px] uppercase tracking-[0.14em] text-faint" style={delay(0)}>
          Tidepool docs <span className="text-white/20">/</span>{" "}
          <span className="text-neon">{entry?.section ?? "Docs"}</span>
        </div>
        <h1 className="m-0 mt-5 text-balance text-[clamp(38px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-fg">
          <span className="tp-line">
            <span style={delay(80)}>
              {home ? (
                <>
                  Tidepool, <GradientText>documented.</GradientText>
                </>
              ) : (
                doc.title
              )}
            </span>
          </span>
        </h1>

        {home && (
          <dl
            className="tp-in m-0 mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.07] sm:grid-cols-2"
            style={delay(260)}
          >
            {FACTS.map(f => (
              <div key={f.k} className="bg-bg p-6 transition-colors duration-300 hover:bg-surface">
                <dt className="font-mono text-[12px] text-neon">{f.k}</dt>
                <dd className="m-0 mt-2 text-[15px] leading-relaxed text-muted">{f.v}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="tp-in mt-10" style={delay(home ? 380 : 220)}>
          <Markdown body={doc.body} />
        </div>

        <nav
          aria-label="Previous and next page"
          className="mt-20 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-8 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={docHref(previous.slug)}
              className="group rounded-xl border border-white/10 p-5 transition-colors hover:border-neon/40 hover:bg-white/[0.02]"
            >
              <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-faint">← Previous</span>
              <span className="mt-1.5 block text-lg font-bold text-fg transition-colors group-hover:text-neon">
                {previous.title}
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={docHref(next.slug)}
              className="group rounded-xl border border-white/10 p-5 text-right transition-colors hover:border-neon/40 hover:bg-white/[0.02]"
            >
              <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Next →</span>
              <span className="mt-1.5 block text-lg font-bold text-fg transition-colors group-hover:text-neon">
                {next.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-neon"
        >
          Edit this page on GitHub ↗
        </a>
      </article>
    </div>
  );
};
