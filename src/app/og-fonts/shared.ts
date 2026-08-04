// Shared palette + font loading for the next/og share cards.
// The colours mirror the CSS tokens in globals.css — satori has no access to
// them, so they are duplicated by hand. Keep in sync.
export const PAPER = "#fcfbf9";
export const INK = "#171614";
export const INK_MUTED = "#7a736e";
export const RULE = "#e2dfda";
export const ACCENT = "#0a6b53";

// Static TTF instances vendored from Google Fonts — satori cannot use
// variable fonts or woff2, so next/font is no help here. Read from disk
// (path.join(process.cwd(), <literal>) is traced into the deployed bundle);
// fetch(new URL(..., import.meta.url)) breaks under Turbopack dev.
async function fontData(path: string) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const buf = await readFile(join(process.cwd(), path));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

let fonts: Promise<{ name: string; data: ArrayBuffer; style: "normal" }[]>;

export function loadOgFonts() {
  // Literal paths so Next's output file tracing bundles the TTFs on deploy.
  fonts ??= Promise.all([
    fontData("src/app/og-fonts/newsreader-400.ttf").then((data) => ({
      name: "Newsreader",
      data,
      style: "normal" as const,
    })),
    fontData("src/app/og-fonts/plex-mono-400.ttf").then((data) => ({
      name: "IBM Plex Mono",
      data,
      style: "normal" as const,
    })),
  ]);
  return fonts;
}
