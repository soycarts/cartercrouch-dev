import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/share/owner";
import {
  getStore,
  internalBase,
  isShareId,
  markdownUrl,
  pdfUrl,
  readerUrl,
} from "@/lib/share";
import { formatDate } from "@/components/share/ShareHeader";
import { CopyButton } from "@/components/share/CopyButton";
import { DocumentForm } from "@/components/share/DocumentForm";
import { revoke, update } from "../../new/actions";

export const dynamic = "force-dynamic";

export default async function ManageDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string; updated?: string }>;
}) {
  const [{ id }, flags] = await Promise.all([params, searchParams]);
  await requireOwner(`/manage/${id}`);
  if (!isShareId(id)) notFound();
  const doc = await getStore().get(id);
  if (!doc) notFound();
  const base = internalBase();
  const revoked = Boolean(doc.revokedAt);

  const links = [
    { label: "Reader", href: readerUrl(id) },
    { label: ".md", href: markdownUrl(id) },
    { label: "PDF", href: pdfUrl(id) },
  ];

  return (
    <div className="shell py-12 sm:py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="kicker text-ink-muted">
          Owner · {flags.published ? "Published ✓" : flags.updated ? "Updated ✓" : "Document"}
        </p>
        <a href={`${base}/manage`} className="link-mono link-mono--in text-ink-muted">
          All documents
        </a>
      </div>
      <h1 className={`mt-4 text-[2rem] leading-[1.1] sm:text-[2.6rem] ${revoked ? "text-ink-muted" : ""}`}>
        {doc.title ?? "Untitled document"}
      </h1>
      <p className="kicker mt-4 text-ink-muted">
        {revoked ? `Revoked ${formatDate(doc.revokedAt!)} · ` : ""}
        Created {formatDate(doc.createdAt)} · Updated {formatDate(doc.updatedAt)}
      </p>

      <div className="mt-8 border-y border-rule">
        {links.map((l) => (
          <div
            key={l.label}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule py-3 last:border-b-0"
          >
            <span className="kicker w-16 text-ink-muted">{l.label}</span>
            <a href={l.href} className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-ink hover:text-accent">
              {l.href}
            </a>
            <div className="flex items-baseline gap-5">
              <CopyButton value={l.href} label="Copy" />
              <a href={l.href} target="_blank" rel="noreferrer" className="link-mono text-ink">
                Open
              </a>
            </div>
          </div>
        ))}
      </div>

      <form action={revoke} className="mt-6 flex flex-wrap items-baseline gap-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revoked" value={revoked ? "0" : "1"} />
        <button
          type="submit"
          className={`kicker cursor-pointer border-b pb-0.5 ${revoked ? "border-accent text-accent" : "border-rule text-ink-muted hover:border-ink hover:text-ink"}`}
        >
          {revoked ? "Restore access" : "Revoke access"}
        </button>
        <span className="kicker text-ink-muted">
          {revoked
            ? "All three URLs currently return 404."
            : "Revoking makes every URL return 404 until restored."}
        </span>
      </form>

      <div className="mt-12 border-t border-rule pt-8">
        <p className="kicker text-ink-muted">Edit · the share ID stays the same</p>
        <DocumentForm
          action={update}
          id={id}
          initialMarkdown={doc.markdown}
          initialFilename={doc.filename ?? ""}
          initialAttachments={doc.attachments ?? []}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
