import type { NextPage } from "next";
import { Landing } from "~~/app/_components/landing/Landing";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Tidepool",
  description:
    "A Scaffold-HBAR template for a vault that owns one SaucerSwap V2 position, compounds its fees, and re-centres when the price leaves the range.",
});

const Home: NextPage = () => <Landing />;

export default Home;
