import { requireOwner } from "@/lib/share/owner";
import { internalBase } from "@/lib/share/urls";
import { DocumentForm } from "@/components/share/DocumentForm";
import { publish } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  await requireOwner("/new");
  const base = internalBase();
  return (
    <div className="shell py-12 sm:py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="kicker text-ink-muted">Owner · New document</p>
        <a href={`${base}/manage`} className="link-mono link-mono--in text-ink-muted">
          All documents
        </a>
      </div>
      <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-[2.6rem]">Publish Markdown</h1>
      <p className="mt-4 max-w-[52ch] text-ink-soft">
        Paste or upload a document. The first H1 becomes its title. Publishing
        creates an unlisted link: anyone with it can read, nobody can find it.
      </p>
      <DocumentForm action={publish} submitLabel="Publish" />
    </div>
  );
}
