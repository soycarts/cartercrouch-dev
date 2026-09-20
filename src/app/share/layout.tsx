import type { Metadata } from "next";
import { internalBase } from "@/lib/share/urls";

// Chrome for share.carter.md: a "CARTER / SHARE" masthead and a quiet footer.
// Every route under here is unlisted, so noindex is set once at the layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Carter / Share",
};

export default function ShareLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const base = internalBase();
  return (
    <>
      <header className="shell no-print">
        <div className="flex items-baseline justify-between gap-6 border-b border-rule pt-6 pb-4">
          <a href={`${base}/`} className="kicker text-ink">
            Carter <span className="text-ink-muted">/</span> Share
          </a>
          <a
            href="https://cartercrouch.dev"
            className="kicker text-ink-muted transition-colors hover:text-ink"
          >
            cartercrouch.dev
          </a>
        </div>
      </header>
      {/* .share-root is the hook the reader's colour scheme hangs off: the
          share host follows the system light/dark preference, while the
          personal site keeps its one committed paper surface. */}
      <main className="share-root flex-1">{children}</main>
      <footer className="shell no-print">
        <div className="kicker flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-rule py-6 text-ink-muted">
          <span>Shared by Carter Crouch</span>
          <span>source: markdown</span>
        </div>
      </footer>
    </>
  );
}
