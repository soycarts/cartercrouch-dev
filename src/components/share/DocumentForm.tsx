"use client";

import { useActionState, useState, useTransition } from "react";
import { preview, type PublishState } from "@/app/share/new/actions";

type Action = (prev: PublishState, formData: FormData) => Promise<PublishState>;

// Shared by /new and /manage/[id]: textarea, optional .md upload, preview
// (rendered server-side through the same sanitizer as the reader), submit.
export function DocumentForm({
  action,
  id,
  initialMarkdown = "",
  submitLabel,
}: {
  action: Action;
  id?: string;
  initialMarkdown?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<PublishState, FormData>(action, {});
  const [markdown, setMarkdown] = useState(state.markdown ?? initialMarkdown);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();

  return (
    <form action={formAction} className="mt-8">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <label htmlFor="markdown" className="kicker text-ink-muted">
          Markdown
        </label>
        <label className="kicker cursor-pointer text-ink-muted hover:text-ink">
          Upload .md
          <input
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setMarkdown(await f.text());
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <textarea
        id="markdown"
        name="markdown"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={22}
        spellCheck={false}
        className="share-field share-textarea mt-2"
        placeholder={"# Title\n\nBody…"}
      />
      {state.error && <p className="mt-3 text-sm text-accent">{state.error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <button type="submit" disabled={pending} className="share-button">
          {pending ? "Working…" : submitLabel}
        </button>
        <button
          type="button"
          disabled={previewing || !markdown.trim()}
          onClick={() => startPreview(async () => setPreviewHtml(await preview(markdown)))}
          className="link-mono link-mono--in cursor-pointer text-ink disabled:opacity-50"
        >
          {previewing ? "Rendering…" : "Preview"}
        </button>
      </div>
      {previewHtml !== null && (
        <div className="mt-12 border-t border-rule pt-8">
          <p className="kicker mb-6 text-ink-muted">Preview</p>
          <div className="prose-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </form>
  );
}
