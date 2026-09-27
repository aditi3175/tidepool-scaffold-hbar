"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { hederaTestnet } from "viem/chains";
import { WagmiProvider } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { LocalChainErrorBanner } from "~~/components/LocalChainErrorBanner";
import { BlockieAvatar } from "~~/components/scaffold-hbar";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldHbarApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <LocalChainErrorBanner />
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster
        toastOptions={{
          style: {
            background: "#142230",
            color: "#e6edf3",
            border: "1px solid #1c2b38",
            borderRadius: "8px",
            fontSize: "14px",
            boxShadow: "0 4px 16px rgb(0 0 0 / 0.35)",
          },
        }}
      />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Tidepool ships a single dark theme, so the wallet modal always matches it.
const rainbowKitTheme = darkTheme({
  accentColor: "#2dd4bf",
  accentColorForeground: "#0a1016",
  borderRadius: "small",
  fontStack: "system",
  overlayBlur: "small",
});

export const ScaffoldHbarAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ProgressBar height="2px" color="#2dd4bf" options={{ showSpinner: false }} />
        <RainbowKitProvider avatar={BlockieAvatar} initialChain={hederaTestnet} theme={rainbowKitTheme}>
          <ScaffoldHbarApp>{children}</ScaffoldHbarApp>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
