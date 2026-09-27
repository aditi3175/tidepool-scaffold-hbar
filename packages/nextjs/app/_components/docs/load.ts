import { readFileSync } from "node:fs";
import path from "node:path";
import { DOCS, type DocEntry, plainText, slugify } from "~~/app/_components/docs/manifest";

export type Heading = { id: string; text: string; level: 2 | 3 };
export type LoadedDoc = DocEntry & { body: string; headings: Heading[] };

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

/** The ## and ### headings of a Markdown body, skipping fenced code. */
function headingsOf(body: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = /^(##|###)\s+(.+?)\s*$/.exec(line);
    if (match) {
      const text = plainText(match[2]);
      headings.push({ id: slugify(text), text, level: match[1].length as 2 | 3 });
    }
  }
  return headings;
}

/** Reads a docs page at build time. The first "# Title" line is dropped: the page renders the title itself. */
export function loadDoc(slug: string): LoadedDoc | undefined {
  const entry = DOCS.find(doc => doc.slug === slug);
  if (!entry) return undefined;
  const raw = readFileSync(path.join(DOCS_DIR, entry.file), "utf8").replace(/\r\n/g, "\n");
  const body = raw.replace(/^#\s+.+\n+/, "");
  return { ...entry, body, headings: headingsOf(body) };
}

/** Page titles and headings, for the client-side search box. */
export function searchIndex() {
  return DOCS.map(doc => ({ slug: doc.slug, title: doc.title, headings: loadDoc(doc.slug)?.headings ?? [] }));
}
