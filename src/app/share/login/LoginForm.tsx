"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 max-w-md">
      <input type="hidden" name="next" value={next} />
      <label className="kicker block text-ink-muted" htmlFor="token">
        Owner token
      </label>
      <input
        id="token"
        name="token"
        type="password"
        autoComplete="current-password"
        required
        className="share-field mt-2"
      />
      {state.error && <p className="mt-3 text-sm text-accent">{state.error}</p>}
      <button type="submit" disabled={pending} className="share-button mt-6">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
