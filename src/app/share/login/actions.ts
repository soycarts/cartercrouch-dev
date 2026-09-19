"use server";

import { redirect } from "next/navigation";
import { endOwnerSession, startOwnerSession, verifyOwnerToken } from "@/lib/share/auth";
import { internalBase } from "@/lib/share/urls";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const token = String(formData.get("token") ?? "");
  if (!verifyOwnerToken(token)) {
    return { error: "That token was not accepted." };
  }
  await startOwnerSession();
  const next = String(formData.get("next") ?? "");
  const base = internalBase();
  // Only ever redirect within this app.
  redirect(next.startsWith("/") && !next.startsWith("//") ? `${base}${next}` : `${base}/new`);
}

export async function logout(): Promise<void> {
  await endOwnerSession();
  redirect(`${internalBase()}/`);
}
