// Publish a Markdown file to share.carter.md from the terminal, optionally
// with context files the reader can download alongside it:
//
//   npm run share -- design.md spec.md strategy.md
//
// Or replace a document that is already published, keeping its URL — the
// context files are replaced wholesale too, so pass every one you still want:
//
//   npm run share -- --update <id> --version 1.1 design.md spec.md
//   npm run share -- --update=<id> --same-version design.md
//
// An update has to say which it is. `--version <label>` publishes a new
// draft and archives the one it replaces at a URL of its own;
// `--same-version` edits the draft that is already there. If the stored
// document predates draft labels and does not carry a "Draft: X" line,
// `--previous-version <label>` says what to file it under.
//
// Reads SHARE_OWNER_TOKEN (and optionally SHARE_API_ORIGIN) from the
// environment or .env.local, and prints the same three URLs either way,
// followed by the URL of every archived draft.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

const USAGE = [
  "usage: npm run share -- [--version <label>] <document.md> [context.md ...]",
  "       npm run share -- --update <id> (--version <label> | --same-version) \\",
  "                        [--previous-version <label>] <document.md> [context.md ...]",
].join("\n");

async function loadDotEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of (await readFile(path, "utf8")).split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

type Args = {
  id: string | null;
  version: string | null;
  previousVersion: string | null;
  sameVersion: boolean;
  /** An `--update`/`--version`/`--previous-version` that was given no value. */
  incomplete: boolean;
  files: string[];
};

/** Pull the flags — each accepting `--flag value` or `--flag=value` — out. */
function parseArgs(argv: string[]): Args {
  const files: string[] = [];
  const values: Record<string, string | null> = {
    "--update": null,
    "--version": null,
    "--previous-version": null,
  };
  let sameVersion = false;
  let incomplete = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--same-version") {
      sameVersion = true;
      continue;
    }
    const name = Object.keys(values).find((f) => arg === f || arg.startsWith(`${f}=`));
    if (!name) {
      files.push(arg);
      continue;
    }
    const value = arg === name ? (argv[i + 1] ?? "") : arg.slice(name.length + 1);
    if (arg === name) i += 1;
    if (!value || value.startsWith("--")) incomplete = true;
    values[name] = value || null;
  }
  return {
    id: values["--update"],
    version: values["--version"],
    previousVersion: values["--previous-version"],
    sameVersion,
    incomplete,
    files,
  };
}

async function main() {
  const { id, version, previousVersion, sameVersion, incomplete, files } = parseArgs(
    process.argv.slice(2),
  );
  const [file, ...extra] = files;
  // An update that says nothing about the draft is the one dangerous case:
  // it used to be the only case, and it silently replaced whatever was
  // there. Say which you mean.
  const undecidedUpdate = Boolean(id) && !version && !sameVersion;
  if (!file || incomplete || undecidedUpdate) {
    if (undecidedUpdate) {
      console.error("An update needs --version <label> or --same-version.\n");
    }
    console.error(USAGE);
    process.exit(2);
  }
  await loadDotEnv();
  const token = process.env.SHARE_OWNER_TOKEN;
  if (!token) {
    console.error("SHARE_OWNER_TOKEN is not set (env or .env.local).");
    process.exit(2);
  }
  const origin = (process.env.SHARE_API_ORIGIN ?? "https://share.carter.md").replace(/\/$/, "");
  const markdown = await readFile(resolve(file), "utf8");
  const attachments = await Promise.all(
    extra.map(async (f) => ({ name: basename(f), markdown: await readFile(resolve(f), "utf8") })),
  );
  const res = await fetch(id ? `${origin}/api/share/${id}` : `${origin}/api/share`, {
    method: id ? "PUT" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      markdown,
      filename: basename(file),
      attachments,
      // --same-version is the absence of a label, which the API reads as
      // "leave the draft where it is".
      ...(version ? { version } : {}),
      ...(previousVersion ? { previousVersion } : {}),
    }),
  });
  const body = (await res.json()) as Record<string, unknown> & {
    url: string;
    markdownUrl: string;
    pdfUrl: string;
    error?: string;
  };
  if (!res.ok) {
    const what = id ? "Update" : "Publish";
    console.error(`${what} failed (${res.status}): ${body.error ?? "unknown error"}`);
    process.exit(1);
  }
  const what = id ? "Updated" : "Published";
  const draft = typeof body.version === "string" ? ` — draft ${body.version}` : "";
  // Newest first, under the three URLs that always point at the current draft.
  const archived = (body.versions ?? []) as { version: string; url: string }[];
  const history = archived.length
    ? "\n\n" +
      [...archived]
        .reverse()
        .map((v) => `draft ${v.version}  ${v.url}`)
        .join("\n")
    : "";
  console.log(`${what} ✓${draft}\n\n${body.url}\n${body.markdownUrl}\n${body.pdfUrl}${history}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
