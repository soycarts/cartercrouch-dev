import type { TocEntry } from "@/lib/share/markdown";
import { ShareHeader } from "./ShareHeader";
import { DocumentViewer, type ViewerDocument } from "./DocumentViewer";
import { AttachmentTree, type ViewerAttachment } from "./AttachmentTree";
import { TableOfContents } from "./TableOfContents";
import type { VersionOption } from "./VersionMenu";

export type ReaderPageProps = {
  title: string | null;
  /** Canonical URL of what is being shown; the H1 links to it. */
  href: string;
  createdAt: string;
  updatedAt: string;
  /** Contents for *this* Markdown, not for the document it belongs to. */
  toc: TocEntry[];
  doc: ViewerDocument;
  initialView?: "reader" | "markdown";
  /** Open on the diff rather than on the draft — `?diff=1`. */
  initialDiff?: boolean;
  documentName: string;
  documentHref: string;
  files: ViewerAttachment[];
  currentFile?: string | null;
  /** The draft being read, and every draft of this document. */
  versionLabel?: string | null;
  versions?: VersionOption[];
  /** Set only on an archived draft: when it was replaced, and by what. */
  superseded?: { at: string; currentHref: string } | null;
};

/**
 * The reader page, whole: title block, side pane, viewer. The document and
 * each of its context files render through this one component, so a file
 * promoted to a page is the same page — same bar, same actions, same theme
 * and size controls, same contents — pointed at different Markdown. An
 * archived draft is that page once more, pointed at an older snapshot.
 */
export function ReaderPage({
  title,
  href,
  createdAt,
  updatedAt,
  toc,
  doc,
  initialView = "reader",
  initialDiff = false,
  documentName,
  documentHref,
  files,
  currentFile = null,
  versionLabel = null,
  versions = [],
  superseded = null,
}: ReaderPageProps) {
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
      <ShareHeader
        title={title}
        href={href}
        createdAt={createdAt}
        updatedAt={updatedAt}
        versionLabel={versionLabel}
        superseded={superseded}
      />
      <DocumentViewer
        doc={doc}
        initialView={initialView}
        initialDiff={initialDiff}
        aside={aside}
        versionLabel={versionLabel}
        versions={versions}
        superseded={superseded}
      />
    </div>
  );
}
