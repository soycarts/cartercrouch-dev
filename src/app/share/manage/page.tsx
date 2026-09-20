import { requireOwner } from "@/lib/share/owner";
import { getStore, internalBase } from "@/lib/share";
import { formatDate } from "@/lib/share/dates";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

// Owner-only index. This is the only place documents are ever listed.
export default async function ManagePage() {
  await requireOwner("/manage");
  const docs = await getStore().list();
  const base = internalBase();
  return (
    <div className="shell py-12 sm:py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="kicker text-ink-muted">Owner · Documents</p>
        <div className="flex items-baseline gap-6">
          <a href={`${base}/new`} className="link-mono link-mono--in text-ink">
            New document
          </a>
          <form action={logout}>
            <button type="submit" className="kicker cursor-pointer text-ink-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-[2.6rem]">
        {docs.length} {docs.length === 1 ? "document" : "documents"}
      </h1>
      <ul className="mt-10 border-t border-rule">
        {docs.map((d) => (
          <li key={d.id} className="border-b border-rule">
            <a
              href={`${base}/manage/${d.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 transition-colors hover:text-accent"
            >
              <span className={`min-w-0 text-[1.1rem] ${d.revokedAt ? "line-through text-ink-muted" : ""}`}>
                {d.title ?? "Untitled document"}
              </span>
              <span className="kicker text-ink-muted">
                {d.revokedAt ? "Revoked · " : ""}
                {formatDate(d.createdAt)} · <span className="normal-case">{d.id}</span>
              </span>
            </a>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="py-6 text-ink-soft">Nothing published yet.</li>
        )}
      </ul>
    </div>
  );
}
