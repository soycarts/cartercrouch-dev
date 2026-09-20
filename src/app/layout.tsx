import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
import { READER_PREFS_SCRIPT } from "@/lib/share/reader-prefs";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#fcfbf9",
};

// Root layout carries only what every hostname shares: fonts, the paper
// surface, and the metadata base. Site chrome lives in (site)/layout.tsx and
// the share.carter.md chrome in share/layout.tsx.
export const metadata: Metadata = {
  metadataBase: new URL("https://cartercrouch.dev"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexMono.variable} h-full antialiased`}
      // The script below writes to this element before React sees it.
      suppressHydrationWarning
    >
      <head>
        {/*
          The share reader's stored theme and text size, applied before the
          first paint so a reader who chose dark never gets a white flash.
          It has to live here: only the root layout can contribute to <head>,
          and a nested layout's inline script would sit in <body>, after the
          point where the browser is free to paint the page background.
          Harmless on the personal site — every dark token is gated behind
          :has(.share-root), and --reader-size has no consumer outside the
          reader — so the site keeps its one committed paper surface.
        */}
        <script dangerouslySetInnerHTML={{ __html: READER_PREFS_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-serif">{children}</body>
    </html>
  );
}
