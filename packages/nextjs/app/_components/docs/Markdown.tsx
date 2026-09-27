import { type ReactNode, isValidElement } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { docByFile, docHref, slugify } from "~~/app/_components/docs/manifest";
import { CopyButton } from "~~/app/_components/tidepool/CopyButton";

/** The plain text of rendered children (for heading ids). */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** "adapt-it.md#section" → "/docs/adapt-it#section"; external and in-page links are left alone. */
function resolveHref(href: string | undefined) {
  if (!href) return { href: "#", external: false };
  if (/^https?:\/\//.test(href)) return { href, external: true };
  const match = /^([\w-]+\.md)(#.*)?$/.exec(href);
  if (match) {
    const doc = docByFile(match[1]);
    if (doc) return { href: `${docHref(doc.slug)}${match[2] ?? ""}`, external: false };
  }
  return { href, external: false };
}

const Heading = ({ level, children }: { level: 2 | 3; children: ReactNode }) => {
  const id = slugify(textOf(children));
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className="group scroll-mt-20">
      {children}
      <a
        href={`#${id}`}
        className="ml-2 text-muted no-underline opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Link to ${textOf(children)}`}
      >
        #
      </a>
    </Tag>
  );
};

const CodeBlock = ({ children }: { children: ReactNode }) => {
  const code = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children : undefined;
  const language = /language-(\w+)/.exec(code?.props.className ?? "")?.[1] ?? "text";
  const text = textOf(code?.props.children ?? children).replace(/\n$/, "");
  return (
    <figure className="my-4 overflow-hidden rounded-lg border border-line bg-surface">
      <figcaption className="flex items-center justify-between border-b border-line px-3 py-1">
        <span className="tp-num text-xs text-muted">{language}</span>
        <CopyButton text={text} />
      </figcaption>
      <pre className="m-0 overflow-x-auto p-4 text-sm leading-5">
        <code className="tp-num text-fg">{text}</code>
      </pre>
    </figure>
  );
};

const components: Components = {
  h2: ({ children }) => <Heading level={2}>{children}</Heading>,
  h3: ({ children }) => <Heading level={3}>{children}</Heading>,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  a: ({ href, children }) => {
    const target = resolveHref(href);
    return target.external ? (
      <a href={target.href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ) : (
      <Link href={target.href}>{children}</Link>
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-line">
      <table>{children}</table>
    </div>
  ),
};

/** A docs page body, styled by the .tp-prose rules in globals.css. */
export const Markdown = ({ body }: { body: string }) => (
  <div className="tp-prose">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {body}
    </ReactMarkdown>
  </div>
);
