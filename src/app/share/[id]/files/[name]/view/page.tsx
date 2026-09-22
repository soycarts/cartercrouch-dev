import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeRouteSegment } from "@/lib/share";
import { attachmentMetadata, attachmentPageProps, loadShareView } from "@/lib/share/page-data";
import { ReaderPage } from "@/components/share/ReaderPage";

// A context file promoted to the primary view: /:id/files/:name/view. The
// bare /:id/files/:name URL keeps serving the Markdown — attachment names end
// in .md, so that is what that URL should return — and /pdf keeps printing it.
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; name: string }>;
type Search = Promise<{ view?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, name } = await params;
  return attachmentMetadata(await loadShareView(id), decodeRouteSegment(name));
}

export default async function AttachmentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const [{ id, name }, search] = await Promise.all([params, searchParams]);
  // Unknown, malformed and revoked documents all resolve to null upstream, so
  // every miss — including an unknown filename — is the same uniform 404.
  const view = await loadShareView(id);
  const props = view ? await attachmentPageProps(view, decodeRouteSegment(name), search) : null;
  if (!props) notFound();
  return <ReaderPage {...props} />;
}
