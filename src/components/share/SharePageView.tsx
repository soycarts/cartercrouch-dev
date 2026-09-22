import type { SharePageProps } from "@/lib/share/page-data";
import { Prose } from "./Prose";
import { ReaderPage } from "./ReaderPage";
import { ShareHeader } from "./ShareHeader";

/**
 * The document page's two faces: the reader, and the bare print view the PDF
 * routes fetch with ?print=1. Both the current draft and an archived one
 * render through here, so they cannot drift apart.
 */
export function SharePageView(props: SharePageProps) {
  if (props.kind === "print") {
    return (
      <div className="shell share-print">
        <ShareHeader
          title={props.title}
          createdAt={props.createdAt}
          updatedAt={props.updatedAt}
        />
        <div className="pt-8">
          <Prose sections={props.sections} />
        </div>
      </div>
    );
  }
  return <ReaderPage {...props.reader} />;
}
