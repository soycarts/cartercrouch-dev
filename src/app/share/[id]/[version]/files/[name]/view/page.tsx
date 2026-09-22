import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeRouteSegment } from "@/lib/share";
import { attachmentMetadata, attachmentPageProps, loadShareView } from "@/lib/share/page-data";
import { ReaderPage } from "@/components/share/ReaderPage";

// The same page inside an archived draft: /:id/:version/files/:name/view.
export const dynamic = "force-dynamic";

// ?diff=1 compares this draft with the live one: two line diffs over two
// documents of up to 900 KB, each with its own budget inside. The default
// serverless ceiling is tighter than the sum of those budgets.
export const maxDuration = 30;

type Params = Promise<{ id: string; version: string; name: string }>;
type Search = Promise<{ view?: string; diff?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, version, name } = await params;
  return attachmentMetadata(await loadShareView(id, version), decodeRouteSegment(name));
}

export default async function ArchivedAttachmentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const [{ id, version, name }, search] = await Promise.all([params, searchParams]);
  const view = await loadShareView(id, version);
  const props = view ? await attachmentPageProps(view, decodeRouteSegment(name), search) : null;
  if (!props) notFound();
  return <ReaderPage {...props} />;
}
