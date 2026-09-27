/**
 * The docs pages, in reading order. Each page's Markdown lives in packages/nextjs/content/docs/<file>, so the same
 * files render on GitHub and at /docs. Introduction is served at /docs; every other page at /docs/<slug>.
 */
export type DocEntry = { slug: string; title: string; file: string; section: string };

export const DOCS: DocEntry[] = [
  { slug: "introduction", title: "Introduction", file: "introduction.md", section: "Getting started" },
  { slug: "quickstart", title: "Quickstart", file: "quickstart.md", section: "Getting started" },
  { slug: "using-the-vault", title: "Using the vault", file: "using-the-vault.md", section: "Guides" },
  {
    slug: "keepers-and-rebalancing",
    title: "Keepers & rebalancing",
    file: "keepers-and-rebalancing.md",
    section: "Guides",
  },
  { slug: "adapt-it", title: "Adapt it to your pool", file: "adapt-it.md", section: "Guides" },
  { slug: "architecture", title: "Architecture", file: "architecture.md", section: "Reference" },
  { slug: "hedera-gotchas", title: "Hedera gotchas", file: "hedera-gotchas.md", section: "Reference" },
  { slug: "troubleshooting", title: "Troubleshooting", file: "troubleshooting.md", section: "Reference" },
  { slug: "testnet-evidence", title: "Testnet evidence", file: "testnet-evidence.md", section: "Reference" },
];

export const docHref = (slug: string) => (slug === "introduction" ? "/docs" : `/docs/${slug}`);

/** The docs page for a Markdown file name ("adapt-it.md"), used to rewrite links between pages. */
export const docByFile = (file: string) => DOCS.find(doc => doc.file === file);

/** Heading text → anchor id. Used by both the renderer and the table of contents, so they always agree. */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Markdown inline syntax removed, for heading text in the TOC and the search index. */
export function plainText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}
