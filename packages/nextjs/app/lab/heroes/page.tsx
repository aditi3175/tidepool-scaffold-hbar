import { Archivo, JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { Heroes } from "./Heroes";
import type { Metadata } from "next";

// Each direction's typeface, loaded only on this page while they are compared.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hero directions", robots: { index: false, follow: false } };

/** Dev-only comparison of three landing directions. Not linked; 404 in production unless TIDEPOOL_LAB=1. */
export default function HeroesPage() {
  if (process.env.NODE_ENV === "production" && process.env.TIDEPOOL_LAB !== "1") notFound();
  return (
    <div
      className={`${manrope.variable} ${archivo.variable} ${space.variable} ${jetbrains.variable} flex flex-1 flex-col`}
    >
      <Heroes />
    </div>
  );
}
