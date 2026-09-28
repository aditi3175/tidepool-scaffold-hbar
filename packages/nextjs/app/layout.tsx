import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-hbar-ui/components/styles.css";
// Loaded here, before globals.css, rather than only by /debug: it is a full precompiled Tailwind build, and when it
// arrived late via client-side navigation it outranked the dashboard's own utilities (e.g. breakpoint grid classes and
// the font variable). Loading it first keeps the cascade order identical on every route and after any navigation.
import "@scaffold-hbar-ui/debug-contracts/styles.css";
import { ScaffoldHbarAppWithProviders } from "~~/components/ScaffoldHbarAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Tidepool",
  description:
    "A SaucerSwap V2 concentrated-liquidity vault on Hedera: HTS share token, fee compounding and a TWAP-guarded rebalance. Built with Scaffold-HBAR.",
});

// Self-hosted by next/font at build time (no runtime request to Google, no new dependency).
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const ScaffoldHbarApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${space.variable} ${jetbrains.variable}`}>
      <body className="bg-bg font-sans text-fg antialiased">
        {/* Tidepool ships a single dark theme. */}
        <ThemeProvider forcedTheme="dark" enableSystem={false}>
          <ScaffoldHbarAppWithProviders>{children}</ScaffoldHbarAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldHbarApp;
