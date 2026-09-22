import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { documentMetadata, loadShareView, sharePageProps } from "@/lib/share/page-data";
import { SharePageView } from "@/components/share/SharePageView";

// Always render from the store; documents can change or be revoked at any time.
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
// `diff` is in the shape for symmetry with the archived page and is ignored
// here: the current draft has nothing to be compared against.
type Search = Promise<{ view?: string; print?: string; file?: string; diff?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return documentMetadata(await loadShareView(id));
}

// The current draft. /:id/:version is the same page against a snapshot.
export default async function SharePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const view = await loadShareView(id);
  if (!view) notFound();
  const props = await sharePageProps(view, search);
  if (!props) notFound();
  return <SharePageView {...props} />;
}
