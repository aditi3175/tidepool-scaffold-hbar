import { notFound } from "next/navigation";
import { DocsPage } from "~~/app/_components/docs/DocsPage";
import { loadDoc } from "~~/app/_components/docs/load";
import { DOCS } from "~~/app/_components/docs/manifest";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

type Props = { params: Promise<{ slug: string }> };

/** Every docs page except Introduction, which is served at /docs. Built statically. */
export const dynamicParams = false;
export function generateStaticParams() {
  return DOCS.filter(doc => doc.slug !== "introduction").map(doc => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const doc = loadDoc(slug);
  return getMetadata({
    title: `${doc?.title ?? "Docs"} · Tidepool docs`,
    description: doc?.body.split("\n")[0] ?? "Tidepool documentation.",
  });
}

const DocsSlugPage = async ({ params }: Props) => {
  const { slug } = await params;
  const doc = slug === "introduction" ? undefined : loadDoc(slug);
  if (!doc) notFound();
  return <DocsPage doc={doc} />;
};

export default DocsSlugPage;
