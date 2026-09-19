"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOwnerSession } from "@/lib/share/auth";
import {
  ShareError,
  getStore,
  internalBase,
  publishDocument,
  setRevoked,
  updateDocument,
} from "@/lib/share";

export type PublishState = { error?: string; markdown?: string };

function inputFrom(formData: FormData): {
  markdown: string;
  attachments: unknown;
  filename: string;
} {
  let attachments: unknown = [];
  try {
    attachments = JSON.parse(String(formData.get("attachments") || "[]"));
  } catch {
    attachments = undefined; // fails validation with a clear message
  }
  return {
    markdown: String(formData.get("markdown") ?? ""),
    attachments,
    filename: String(formData.get("filename") ?? ""),
  };
}

function fail(err: unknown, markdown: string): PublishState {
  if (err instanceof ShareError) return { error: err.message, markdown };
  throw err;
}

export async function publish(_prev: PublishState, formData: FormData): Promise<PublishState> {
  if (!(await isOwnerSession())) return { error: "Not signed in." };
  const input = inputFrom(formData);
  const markdown = input.markdown;
  try {
    const doc = await publishDocument(getStore(), input);
    redirect(`${internalBase()}/manage/${doc.id}?published=1`);
  } catch (err) {
    return fail(err, markdown);
  }
}

export async function update(_prev: PublishState, formData: FormData): Promise<PublishState> {
  if (!(await isOwnerSession())) return { error: "Not signed in." };
  const id = String(formData.get("id") ?? "");
  const input = inputFrom(formData);
  const markdown = input.markdown;
  try {
    await updateDocument(getStore(), id, input);
  } catch (err) {
    return fail(err, markdown);
  }
  revalidatePath(`/share/${id}`);
  redirect(`${internalBase()}/manage/${id}?updated=1`);
}

export async function revoke(formData: FormData): Promise<void> {
  if (!(await isOwnerSession())) return;
  const id = String(formData.get("id") ?? "");
  const revoked = formData.get("revoked") === "1";
  await setRevoked(getStore(), id, revoked);
  revalidatePath(`/share/${id}`);
  redirect(`${internalBase()}/manage/${id}`);
}

/** Sanitized HTML for the in-form preview; owner-only like everything here. */
export async function preview(markdown: string): Promise<string> {
  if (!(await isOwnerSession())) return "";
  const { renderHtml } = await import("@/lib/share/markdown");
  return renderHtml(markdown);
}
