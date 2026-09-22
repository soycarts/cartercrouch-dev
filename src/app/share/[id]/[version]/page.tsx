import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { documentMetadata, loadShareView, sharePageProps } from "@/lib/share/page-data";
import { SharePageView } from "@/components/share/SharePageView";

// An archived draft, read exactly as the current one is. Next matches its
// static segments first, so /files, /md and /pdf never reach this route —
// and the "draft" prefix on the slug means they could not match it anyway.
export const dynamic = "force-dynamic";

// ?diff=1 compares this draft with the live one: two line diffs over two
// documents of up to 900 KB, each with its own budget inside. The default
// serverless ceiling is tighter than the sum of those budgets.
export const maxDuration = 30;

type Params = Promise<{ id: string; version: string }>;
type Search = Promise<{ view?: string; print?: string; file?: string; diff?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id, version } = await params;
  return documentMetadata(await loadShareView(id, version));
}

export default async function SharedVersionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const [{ id, version }, search] = await Promise.all([params, searchParams]);
  const view = await loadShareView(id, version);
  if (!view) notFound();
  const props = await sharePageProps(view, search);
  if (!props) notFound();
  return <SharePageView {...props} />;
}
