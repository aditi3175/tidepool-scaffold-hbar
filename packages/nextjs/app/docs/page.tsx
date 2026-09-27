import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";
import { GITHUB_URL, README_URL } from "~~/utils/tidepool/constants";

export const metadata = getMetadata({
  title: "Docs · Tidepool",
  description: "Tidepool documentation.",
});

/** Temporary docs page: the docs site is built from content/docs in a later change. */
const Docs: NextPage = () => (
  <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 pt-12 sm:px-6 sm:pt-16">
    <h1 className="m-0 text-title font-semibold tracking-tight text-fg">Docs</h1>
    <p className="max-w-2xl text-base text-muted">
      The documentation currently lives in the repository: setup, using the vault, keepers, adapting it to your pool and
      the testnet evidence.
    </p>
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
      <li>
        <a href={README_URL} target="_blank" rel="noreferrer" className="text-teal hover:underline">
          README on GitHub
        </a>
      </li>
      <li>
        <a
          href={`${GITHUB_URL}/blob/main/docs/ARCHITECTURE.md`}
          target="_blank"
          rel="noreferrer"
          className="text-teal hover:underline"
        >
          Architecture notes
        </a>
      </li>
    </ul>
  </div>
);

export default Docs;
