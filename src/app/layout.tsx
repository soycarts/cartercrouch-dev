import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { profile, socials } from "@/lib/data";
import { Masthead } from "@/components/Masthead";

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

const title = `${profile.name} — ${profile.role}`;
const description =
  "Carter Crouch is an analytics engineer building AI agent systems — Zapflex, Bountify.ai, and Swarmtip. Based in Los Angeles and London.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cartercrouch.dev"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: profile.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@soycarts",
  },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: "https://cartercrouch.dev",
  jobTitle: profile.role,
  sameAs: socials.map((s) => s.href),
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </head>
      <body className="flex min-h-full flex-col font-serif">
        <Masthead />
        {children}
      </body>
    </html>
  );
}
