import type { TocEntry } from "@/lib/share/markdown";
import { ShareHeader } from "./ShareHeader";
import { DocumentViewer, type ViewerDocument } from "./DocumentViewer";
import { AttachmentTree, type ViewerAttachment } from "./AttachmentTree";
import { TableOfContents } from "./TableOfContents";

/**
 * The reader page, whole: title block, side pane, viewer. The document and
 * each of its context files render through this one component, so a file
 * promoted to a page is the same page — same bar, same actions, same theme
 * and size controls, same contents — pointed at different Markdown.
 */
export function ReaderPage({
  title,
  href,
  createdAt,
  updatedAt,
  toc,
  doc,
  initialView = "reader",
  documentName,
  documentHref,
  files,
  currentFile = null,
}: {
  title: string | null;
  /** Canonical URL of what is being shown; the H1 links to it. */
  href: string;
  createdAt: string;
  updatedAt: string;
  /** Contents for *this* Markdown, not for the document it belongs to. */
  toc: TocEntry[];
  doc: ViewerDocument;
  initialView?: "reader" | "markdown";
  documentName: string;
  documentHref: string;
  files: ViewerAttachment[];
  currentFile?: string | null;
}) {
  // The side pane carries the file tree (when there are attachments) above
  // the contents list. With neither, the prose gets the whole measure. The
  // viewer places it beside the body, under a bar that spans both.
  const hasPane = files.length > 0 || toc.length > 1;
  const aside = hasPane ? (
    <>
      <AttachmentTree
        documentName={documentName}
        documentHref={documentHref}
        files={files}
        currentFile={currentFile}
      />
      <TableOfContents items={toc} />
    </>
  ) : null;

  return (
    <div className="shell">
      <ShareHeader title={title} href={href} createdAt={createdAt} updatedAt={updatedAt} />
      <DocumentViewer doc={doc} initialView={initialView} aside={aside} />
    </div>
  );
}
