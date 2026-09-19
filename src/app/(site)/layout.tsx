import type { Metadata } from "next";
import { profile, socials } from "@/lib/data";
import { Masthead } from "@/components/Masthead";

const title = `${profile.name} — ${profile.role}`;
const description =
  "Carter Crouch is an analytics engineer building AI agent systems. Based in Los Angeles and London.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: profile.name,
    type: "website",
    locale: "en_US",
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

// The personal site proper: masthead, Person schema, and site-wide metadata.
// The share.carter.md routes under /share deliberately sit outside this group
// so none of this chrome leaks onto shared documents.
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <Masthead />
      {children}
    </>
  );
}
