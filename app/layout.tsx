import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fit Check",
  description: "Your own 15-second runway. Get outfit-aware AI reactions, a personal style breakdown, and photos worth saving.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#101011" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
