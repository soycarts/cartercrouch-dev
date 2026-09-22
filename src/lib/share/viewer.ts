import type { ViewerAttachment } from "@/components/share/AttachmentTree";
import { renderDocument, renderHtml } from "./markdown";
import type { SharedDocument } from "./store";
import { attachmentPageUrl, attachmentPdfUrl, attachmentUrl } from "./urls";

/**
 * Every context file, rendered and addressed, ready for the side pane's
 * popup viewer and its "open as page" link. The document page and each
 * file's own page both need the whole list — the pane is the same on all of
 * them — so they build it the same way, here.
 */
export function loadViewerAttachments(
  doc: SharedDocument,
  /** The archived draft being read, if any; every link stays inside it. */
  version: string | null = null,
): Promise<ViewerAttachment[]> {
  return Promise.all(
    (doc.attachments ?? []).map(async (a): Promise<ViewerAttachment> => {
      const rendered = await renderDocument(a.markdown);
      return {
        name: a.name,
        title: rendered.title,
        sections: rendered.sections,
        html: await renderHtml(a.markdown),
        markdown: a.markdown,
        pdfUrl: attachmentPdfUrl(doc.id, a.name, version),
        markdownUrl: attachmentUrl(doc.id, a.name, version),
        pageUrl: attachmentPageUrl(doc.id, a.name, version),
      };
    }),
  );
}
