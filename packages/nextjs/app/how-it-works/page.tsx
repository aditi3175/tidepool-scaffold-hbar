import type { NextPage } from "next";
import { HowItWorks } from "~~/app/_components/how/HowItWorks";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "How it works · Tidepool",
  description:
    "How the Tidepool vault earns inside its range, ignores one-trade price moves, re-centres, and compounds its fees.",
});

const HowItWorksPage: NextPage = () => <HowItWorks />;

export default HowItWorksPage;
