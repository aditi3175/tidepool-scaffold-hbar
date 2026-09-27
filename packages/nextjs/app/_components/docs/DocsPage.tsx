import Link from "next/link";
import { DocsSidebar } from "~~/app/_components/docs/DocsSidebar";
import { Markdown } from "~~/app/_components/docs/Markdown";
import { type LoadedDoc, searchIndex } from "~~/app/_components/docs/load";
import { DOCS, docHref } from "~~/app/_components/docs/manifest";
import { GITHUB_URL } from "~~/utils/tidepool/constants";

/** A docs page: sidebar with search, the article, an "On this page" list, and previous/next links. */
export const DocsPage = ({ doc }: { doc: LoadedDoc }) => {
  const index = searchIndex();
  const position = DOCS.findIndex(entry => entry.slug === doc.slug);
  const previous = position > 0 ? DOCS[position - 1] : undefined;
  const next = position < DOCS.length - 1 ? DOCS[position + 1] : undefined;

  return (
    <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[208px_minmax(0,1fr)] xl:grid-cols-[208px_minmax(0,1fr)_200px]">
      {/* Sidebar: a disclosure on small screens, a sticky column on large ones */}
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <details className="rounded-lg border border-line bg-surface lg:hidden">
          <summary className="cursor-pointer px-3 py-2 text-sm text-fg">Docs menu</summary>
          <div className="border-t border-line p-3">
            <DocsSidebar index={index} />
          </div>
        </details>
        <div className="hidden lg:block">
          <DocsSidebar index={index} />
        </div>
      </aside>

      <article className="min-w-0 max-w-[720px]">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{doc.title}</h1>
          <a
            href={`${GITHUB_URL}/blob/main/packages/nextjs/content/docs/${doc.file}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted hover:text-fg"
          >
            View source on GitHub
          </a>
        </div>
        <Markdown body={doc.body} />

        <nav aria-label="Previous and next page" className="mt-12 grid grid-cols-2 gap-4 border-t border-line pt-6">
          {previous ? (
            <Link href={docHref(previous.slug)} className="rounded-lg border border-line p-3 hover:border-muted">
              <span className="block text-xs text-muted">Previous</span>
              <span className="text-sm text-fg">{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={docHref(next.slug)} className="rounded-lg border border-line p-3 text-right hover:border-muted">
              <span className="block text-xs text-muted">Next</span>
              <span className="text-sm text-fg">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <aside className="hidden xl:sticky xl:top-20 xl:block xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto">
        {doc.headings.length > 0 && (
          <nav aria-label="On this page" className="text-sm">
            <div className="mb-2 text-xs font-medium text-muted">On this page</div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {doc.headings.map(heading => (
                <li key={heading.id} className={heading.level === 3 ? "pl-3" : undefined}>
                  <a href={`#${heading.id}`} className="block py-0.5 text-muted hover:text-fg">
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </aside>
    </div>
  );
};
