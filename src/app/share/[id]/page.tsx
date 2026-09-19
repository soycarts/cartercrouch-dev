import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStore, getPublicDocument, readerUrl } from "@/lib/share";
import { renderDocument } from "@/lib/share/markdown";
import { ShareHeader } from "@/components/share/ShareHeader";
import { ShareControls } from "@/components/share/ShareControls";
import { Prose } from "@/components/share/Prose";
import { CopyButton } from "@/components/share/CopyButton";

// Always render from the store; documents can change or be revoked at any time.
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type Search = Promise<{ view?: string; print?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const doc = await getPublicDocument(getStore(), id);
  if (!doc) return { title: "Document not found", robots: { index: false, follow: false } };
  const { title, description } = await renderDocument(doc.markdown);
  const pageTitle = title ?? "Untitled document";
  const url = readerUrl(doc.id);
  return {
    title: `${pageTitle} — Carter / Share`,
    description: description ?? undefined,
    robots: { index: false, follow: false },
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: pageTitle,
      description: description ?? undefined,
      siteName: "Carter / Share",
      locale: "en_US",
      publishedTime: doc.createdAt,
      modifiedTime: doc.updatedAt,
      authors: ["Carter Crouch"],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: description ?? undefined,
      creator: "@soycarts",
    },
  };
}

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const [{ id }, { view, print }] = await Promise.all([params, searchParams]);
  const doc = await getPublicDocument(getStore(), id);
  if (!doc) notFound();

  const rendered = await renderDocument(doc.markdown);
  const markdownView = view === "markdown";
  const printing = print === "1";

  return (
    <div className={`shell ${printing ? "share-print" : ""}`}>
      <ShareHeader title={rendered.title} createdAt={doc.createdAt} updatedAt={doc.updatedAt} />
      {!printing && (
        <ShareControls
          id={doc.id}
          view={markdownView ? "markdown" : "reader"}
          allowPdf={doc.settings.allowPdf}
          allowMarkdownDownload={doc.settings.allowMarkdownDownload}
        />
      )}
      {markdownView ? (
        <div className="py-8 sm:py-10">
          <div className="kicker mb-4 flex items-baseline justify-between gap-6 text-ink-muted">
            <span>Canonical source</span>
            <CopyButton value={doc.markdown} label="Copy Markdown" />
          </div>
          <pre className="share-source">{doc.markdown}</pre>
        </div>
      ) : (
        <div className="pt-8 sm:pt-10">
          <Prose sections={rendered.sections} />
        </div>
      )}
    </div>
  );
}
