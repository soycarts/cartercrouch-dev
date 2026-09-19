import { isOwnerConfigured, isOwnerSession } from "@/lib/share/auth";
import { internalBase, safeNextPath } from "@/lib/share/urls";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await isOwnerSession()) redirect(`${internalBase()}${safeNextPath(next)}`);
  return (
    <div className="shell py-16 sm:py-24">
      <p className="kicker text-ink-muted">Owner</p>
      <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-[2.6rem]">Sign in</h1>
      {isOwnerConfigured() ? (
        <LoginForm next={next ?? ""} />
      ) : (
        <p className="mt-6 max-w-[48ch] text-ink-soft">
          <code className="font-mono text-[0.85em]">SHARE_OWNER_TOKEN</code> is not
          configured, so publishing is disabled on this deployment.
        </p>
      )}
    </div>
  );
}
