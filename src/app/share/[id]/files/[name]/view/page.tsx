import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  attachmentPageUrl,
  attachmentPdfUrl,
  attachmentUrl,
  decodeRouteSegment,
  documentFilename,
  findAttachment,
  getStore,
  getPublicDocument,
  readerUrl,
} from "@/lib/share";
import { renderDocument, renderHtml } from "@/lib/share/markdown";
import { loadViewerAttachments } from "@/lib/share/viewer";
import { ReaderPage } from "@/components/share/ReaderPage";

// A context file promoted to the primary view: /:id/files/:name/view. The
// bare /:id/files/:name URL keeps serving the Markdown — attachment names end
// in .md, so that is what that URL should return — and /pdf keeps printing it.
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; name: string }>;
type Search = Promise<{ view?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, name } = await params;
  const doc = await getPublicDocument(getStore(), id);
  const file = doc ? findAttachment(doc, decodeRouteSegment(name)) : null;
  if (!doc || !file) return { title: "Document not found", robots: { index: false, follow: false } };
  const { title, description } = await renderDocument(file.markdown);
  const pageTitle = title ?? file.name;
  const url = attachmentPageUrl(doc.id, file.name);
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

export default async function AttachmentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const [{ id, name }, { view }] = await Promise.all([params, searchParams]);
  // Unknown, malformed and revoked documents all resolve to null upstream, so
  // every miss — including an unknown filename — is the same uniform 404.
  const doc = await getPublicDocument(getStore(), id);
  const file = doc ? findAttachment(doc, decodeRouteSegment(name)) : null;
  if (!doc || !file) notFound();

  const [rendered, html, files] = await Promise.all([
    renderDocument(file.markdown),
    renderHtml(file.markdown),
    loadViewerAttachments(doc),
  ]);

  return (
    <ReaderPage
      title={rendered.title ?? file.name}
      href={attachmentPageUrl(doc.id, file.name)}
      createdAt={doc.createdAt}
      updatedAt={doc.updatedAt}
      toc={rendered.toc}
      doc={{
        sections: rendered.sections,
        html,
        markdown: file.markdown,
        pdfUrl: attachmentPdfUrl(doc.id, file.name),
        markdownUrl: attachmentUrl(doc.id, file.name),
      }}
      initialView={view === "markdown" ? "markdown" : "reader"}
      documentName={documentFilename(doc)}
      documentHref={readerUrl(doc.id)}
      files={files}
      currentFile={file.name}
    />
  );
}
