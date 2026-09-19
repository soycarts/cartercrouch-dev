import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  attachmentPdfUrl,
  attachmentUrl,
  downloadFilename,
  findAttachment,
  getStore,
  getPublicDocument,
  markdownUrl,
  pdfUrl,
  readerUrl,
} from "@/lib/share";
import { renderDocument, renderHtml } from "@/lib/share/markdown";
import { ShareHeader } from "@/components/share/ShareHeader";
import { Prose } from "@/components/share/Prose";
import { DocumentViewer } from "@/components/share/DocumentViewer";
import { AttachmentTree, type ViewerAttachment } from "@/components/share/AttachmentTree";

// Always render from the store; documents can change or be revoked at any time.
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type Search = Promise<{ view?: string; print?: string; file?: string }>;

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
  const [{ id }, { view, print, file }] = await Promise.all([params, searchParams]);
  const doc = await getPublicDocument(getStore(), id);
  if (!doc) notFound();

  // Print view for the PDF route: main document, or one attachment.
  if (print === "1") {
    const target = file ? findAttachment(doc, file) : null;
    if (file && !target) notFound();
    const source = target ? target.markdown : doc.markdown;
    const rendered = await renderDocument(source);
    return (
      <div className="shell share-print">
        <ShareHeader
          title={rendered.title ?? target?.name ?? null}
          createdAt={doc.createdAt}
          updatedAt={doc.updatedAt}
        />
        <div className="pt-8">
          <Prose sections={rendered.sections} />
        </div>
      </div>
    );
  }

  const [rendered, html, files] = await Promise.all([
    renderDocument(doc.markdown),
    renderHtml(doc.markdown),
    Promise.all(
      doc.attachments.map(async (a): Promise<ViewerAttachment> => {
        const r = await renderDocument(a.markdown);
        return {
          name: a.name,
          title: r.title,
          sections: r.sections,
          html: await renderHtml(a.markdown),
          markdown: a.markdown,
          pdfUrl: attachmentPdfUrl(doc.id, a.name),
          markdownUrl: attachmentUrl(doc.id, a.name),
        };
      }),
    ),
  ]);

  const viewer = (
    <DocumentViewer
      doc={{
        sections: rendered.sections,
        html,
        markdown: doc.markdown,
        pdfUrl: pdfUrl(doc.id),
        markdownUrl: markdownUrl(doc.id),
      }}
      initialView={view === "markdown" ? "markdown" : "reader"}
    />
  );

  return (
    <div className="shell">
      <ShareHeader title={rendered.title} createdAt={doc.createdAt} updatedAt={doc.updatedAt} />
      {files.length > 0 ? (
        <div className="share-layout">
          <AttachmentTree
            documentName={downloadFilename(rendered.title, doc.id, "md")}
            files={files}
          />
          <div className="min-w-0">{viewer}</div>
        </div>
      ) : (
        viewer
      )}
    </div>
  );
}
