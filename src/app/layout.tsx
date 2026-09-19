import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
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
    >
      <body className="flex min-h-full flex-col font-serif">{children}</body>
    </html>
  );
}
