import { CopyButton } from "./CopyButton";
import { internalBase, markdownUrl, pdfUrl, readerUrl } from "@/lib/share/urls";

type View = "reader" | "markdown";

// Reader / Markdown switch plus downloads and copy actions. Views are plain
// links (server-rendered), so the toggle works with JavaScript disabled.
export function ShareControls({
  id,
  view,
  allowPdf,
  allowMarkdownDownload,
}: {
  id: string;
  view: View;
  allowPdf: boolean;
  allowMarkdownDownload: boolean;
}) {
  const base = internalBase();
  const tab = (target: View, label: string) => {
    const active = view === target;
    return (
      <a
        href={target === "reader" ? `${base}/${id}` : `${base}/${id}?view=markdown`}
        aria-current={active ? "page" : undefined}
        className={`kicker border-b pb-0.5 transition-colors ${
          active
            ? "border-ink text-ink"
            : "border-transparent text-ink-muted hover:text-ink"
        }`}
      >
        {label}
      </a>
    );
  };

  return (
    <div className="share-controls no-print">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 border-y border-rule py-4">
        <div className="flex items-baseline gap-5">
          {tab("reader", "Reader")}
          {tab("markdown", "Markdown")}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
          {allowPdf && (
            <a href={`${pdfUrl(id)}?download=1`} className="link-mono link-mono--down text-ink">
              PDF
            </a>
          )}
          {allowMarkdownDownload && (
            <a href={`${markdownUrl(id)}?download=1`} className="link-mono link-mono--down text-ink">
              .md
            </a>
          )}
          <CopyButton value={readerUrl(id)} label="Copy link" />
        </div>
      </div>
      <div className="kicker flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-3 text-ink-muted">
        <span>For agents</span>
        <a href={markdownUrl(id)} className="text-ink-muted underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-accent">
          .md
        </a>
        <span aria-hidden>·</span>
        <CopyButton value={markdownUrl(id)} label="copy source URL" className="!border-transparent !text-ink-muted hover:!text-ink" />
      </div>
    </div>
  );
}
