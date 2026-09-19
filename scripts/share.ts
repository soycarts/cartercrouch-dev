// Publish a Markdown file to share.carter.md from the terminal, optionally
// with context files the reader can download alongside it:
//
//   npm run share -- design.md spec.md strategy.md
//
// Reads SHARE_OWNER_TOKEN (and optionally SHARE_API_ORIGIN) from the
// environment or .env.local, POSTs the file, and prints the three URLs.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

async function loadDotEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of (await readFile(path, "utf8")).split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

async function main() {
  const [file, ...extra] = process.argv.slice(2);
  if (!file) {
    console.error("usage: npm run share -- <document.md> [context.md ...]");
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
  const res = await fetch(`${origin}/api/share`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, attachments }),
  });
  const body = (await res.json()) as Record<string, string>;
  if (!res.ok) {
    console.error(`Publish failed (${res.status}): ${body.error ?? "unknown error"}`);
    process.exit(1);
  }
  console.log(`Published ✓\n\n${body.url}\n${body.markdownUrl}\n${body.pdfUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
