import type { Metadata, Viewport } from "next";
import { DM_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";

// Lookbook type: a fashion-house grotesk for headlines, numbers and body,
// and a typewriter mono for labels, counters and descriptive paragraphs.
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-inter-tight", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: "oko",
  description: "Your own 15-second runway. Get outfit-aware AI reactions, a personal style breakdown, and photos worth saving.",
};
// viewportFit "cover" makes env(safe-area-inset-*) available for the top and bottom bands.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#121212" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${interTight.variable} ${dmMono.variable}`}><body>{children}</body></html>;
}
