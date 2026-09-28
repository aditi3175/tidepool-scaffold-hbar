import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { UiLab } from "./UiLab";
import type { Metadata } from "next";

// Candidate fonts, loaded only on this page while the direction is in review.
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
});

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "UI style sheet", robots: { index: false, follow: false } };

/** Dev-only style sheet for the UI v3 direction. Not linked; 404 in production unless TIDEPOOL_LAB=1 at runtime. */
export default function UiLabPage() {
  if (process.env.NODE_ENV === "production" && process.env.TIDEPOOL_LAB !== "1") notFound();
  return (
    <div className={`${plex.variable} ${plexMono.variable} ${instrument.variable} flex flex-1 flex-col`}>
      <UiLab />
    </div>
  );
}
