// Publish a Markdown file to share.carter.md from the terminal, optionally
// with context files the reader can download alongside it:
//
//   npm run share -- design.md spec.md strategy.md
//
// Or replace a document that is already published, keeping its URL — the
// context files are replaced wholesale too, so pass every one you still want:
//
//   npm run share -- --update <id> design.md spec.md strategy.md
//   npm run share -- --update=<id> design.md
//
// Reads SHARE_OWNER_TOKEN (and optionally SHARE_API_ORIGIN) from the
// environment or .env.local, and prints the same three URLs either way.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

const USAGE =
  "usage: npm run share -- [--update <id>] <document.md> [context.md ...]";

async function loadDotEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of (await readFile(path, "utf8")).split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

/** Pull `--update <id>` / `--update=<id>` out of the argument list. */
function parseArgs(argv: string[]): { id: string | null; files: string[] } {
  const files: string[] = [];
  let id: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--update") {
      id = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith("--update=")) {
      id = arg.slice("--update=".length);
    } else {
      files.push(arg);
    }
  }
  return { id: id || null, files };
}

async function main() {
  const { id, files } = parseArgs(process.argv.slice(2));
  const [file, ...extra] = files;
  if (!file || (process.argv.includes("--update") && !id)) {
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
    body: JSON.stringify({ markdown, filename: basename(file), attachments }),
  });
  const body = (await res.json()) as Record<string, string>;
  if (!res.ok) {
    const what = id ? "Update" : "Publish";
    console.error(`${what} failed (${res.status}): ${body.error ?? "unknown error"}`);
    process.exit(1);
  }
  const what = id ? "Updated" : "Published";
  console.log(`${what} ✓\n\n${body.url}\n${body.markdownUrl}\n${body.pdfUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
