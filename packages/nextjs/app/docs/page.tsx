import { notFound } from "next/navigation";
import { DocsPage } from "~~/app/_components/docs/DocsPage";
import { loadDoc } from "~~/app/_components/docs/load";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Introduction · Tidepool docs",
  description: "What Tidepool is, what the vault does on chain, and where to go next.",
});

/** /docs: the Introduction page. */
const DocsIndex = () => {
  const doc = loadDoc("introduction");
  if (!doc) notFound();
  return <DocsPage doc={doc} />;
};

export default DocsIndex;
