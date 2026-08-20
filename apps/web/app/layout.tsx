import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Source_Serif_4, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { ThemeScript } from "@/components/layout/theme-script";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FlightPulse UK — UK Aviation Intelligence",
    template: "%s · FlightPulse UK",
  },
  description:
    "Explore UK airport traffic, routes, airline activity and flight punctuality using official CAA statistics.",
  openGraph: {
    type: "website",
    siteName: "FlightPulse UK",
    title: "FlightPulse UK — UK Aviation Intelligence",
    description:
      "Explore UK airport traffic, routes, airline activity and flight punctuality using official CAA statistics.",
  },
  twitter: {
    card: "summary",
    title: "FlightPulse UK — UK Aviation Intelligence",
    description:
      "Explore UK airport traffic, routes, airline activity and flight punctuality using official CAA statistics.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent-500 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
