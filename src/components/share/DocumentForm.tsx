"use client";

import { useActionState, useState, useTransition } from "react";
import { preview, type PublishState } from "@/app/share/new/actions";
import type { Attachment } from "@/lib/share/store";

type Action = (prev: PublishState, formData: FormData) => Promise<PublishState>;

// Shared by /new and /manage/[id]: Markdown textarea, optional .md upload,
// context-file attachments, preview, submit.
export function DocumentForm({
  action,
  id,
  initialMarkdown = "",
  initialFilename = "",
  initialVersion = "",
  requireVersion = false,
  initialAttachments = [],
  submitLabel,
}: {
  action: Action;
  id?: string;
  initialMarkdown?: string;
  initialFilename?: string;
  /** The draft this document is on; empty for one published before drafts. */
  initialVersion?: string;
  /** Once a document has a label, every save has to name one. */
  requireVersion?: boolean;
  initialAttachments?: Attachment[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<PublishState, FormData>(action, {});
  const [markdown, setMarkdown] = useState(state.markdown ?? initialMarkdown);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [filename, setFilename] = useState(initialFilename);
  const [version, setVersion] = useState(initialVersion);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, startPreview] = useTransition();

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const incoming = await Promise.all(
      [...list].map(async (f) => ({ name: f.name, markdown: await f.text() })),
    );
    setAttachments((prev) => {
      const next = prev.filter(
        (p) => !incoming.some((n) => n.name.toLowerCase() === p.name.toLowerCase()),
      );
      return [...next, ...incoming];
    });
  };

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
              if (f) {
                setMarkdown(await f.text());
                if (!filename) setFilename(f.name);
              }
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

      <label htmlFor="filename" className="kicker mt-8 block text-ink-muted">
        Filename
      </label>
      <input
        id="filename"
        name="filename"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder="derived from the title if blank"
        pattern="[A-Za-z0-9][A-Za-z0-9._ \-]{0,78}\.md"
        className="share-field mt-2 max-w-md"
      />

      {/* Saving with the label that is already there edits this draft;
          changing it archives the current one at a URL of its own. The
          field is prefilled, so the quiet path is the in-place edit. */}
      <label htmlFor="version" className="kicker mt-8 block text-ink-muted">
        Draft
      </label>
      <input
        id="version"
        name="version"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        required={requireVersion}
        placeholder={requireVersion ? "1.1" : "leave blank to keep this draft unlabelled"}
        pattern="[0-9A-Za-z]+(\.[0-9A-Za-z]+)*"
        title="Letters and digits in dot-separated groups, e.g. 1.0"
        className="share-field mt-2 max-w-md"
      />
      <p className="kicker mt-2 text-ink-muted">
        {version && version !== initialVersion
          ? `Saving archives draft ${initialVersion || "the current one"} at its own URL.`
          : "Saving with the same label edits this draft in place."}
      </p>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4">
        <span className="kicker text-ink-muted">Files</span>
        <label className="kicker cursor-pointer text-ink-muted hover:text-ink">
          Add .md files
          <input
            type="file"
            multiple
            accept=".md,.markdown,text/markdown,text/plain"
            className="sr-only"
            onChange={async (e) => {
              await addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <ul className="mt-2 border-t border-rule">
        {attachments.map((a) => (
          <li
            key={a.name}
            className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 font-mono text-[0.8rem]"
          >
            <span className="truncate">{a.name}</span>
            <button
              type="button"
              onClick={() => setAttachments((prev) => prev.filter((p) => p.name !== a.name))}
              className="kicker shrink-0 cursor-pointer text-ink-muted hover:text-ink"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <input type="hidden" name="attachments" value={JSON.stringify(attachments)} />

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
