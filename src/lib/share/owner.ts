import { redirect } from "next/navigation";
import { isOwnerSession } from "./auth";
import { internalBase } from "./urls";

/** Gate for owner-only pages: bounce to /login when there's no session. */
export async function requireOwner(next?: string): Promise<void> {
  if (await isOwnerSession()) return;
  const base = internalBase();
  const target = next ? `${base}/login?next=${encodeURIComponent(next)}` : `${base}/login`;
  redirect(target);
}
