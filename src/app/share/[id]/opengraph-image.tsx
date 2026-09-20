import { ImageResponse } from "next/og";
import { getStore, getPublicDocument } from "@/lib/share";
import { renderDocument } from "@/lib/share/markdown";
import { PAPER, INK, INK_MUTED, RULE, ACCENT, loadOgFonts } from "@/app/og-fonts/shared";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Carter / Share";

// Branded card for Telegram and friends: the CC mark, the document's full
// title, its lede, and the host it came from.
const MAX_TITLE = 170;

/** Step the title down as it grows so a long one wraps instead of spilling. */
function titleSize(length: number): number {
  if (length > 130) return 40;
  if (length > 100) return 46;
  if (length > 72) return 52;
  if (length > 60) return 56;
  if (length > 48) return 64;
  if (length > 28) return 72;
  return 88;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getPublicDocument(getStore(), id);
  const rendered = doc ? await renderDocument(doc.markdown) : null;
  const full = rendered?.title ?? (doc ? "Untitled document" : "Document not found");
  // Past this even 40px will not fit three lines of card; clip on a word.
  const title =
    full.length > MAX_TITLE ? full.slice(0, MAX_TITLE).replace(/\s+\S*$/, "") + "…" : full;
  const size_ = titleSize(title.length);
  // A long title needs the room the lede would take.
  const description = title.length > 100 ? "" : (rendered?.description ?? "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: PAPER,
          color: INK,
          fontFamily: "Newsreader",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 28,
            borderBottom: `1px solid ${RULE}`,
            fontFamily: "IBM Plex Mono",
            fontSize: 24,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                background: INK,
                color: PAPER,
                fontSize: 24,
                letterSpacing: 0,
              }}
            >
              CC
            </div>
            <div style={{ display: "flex", color: INK }}>Carter / Share</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 10, height: 10, background: ACCENT }} />
            <div style={{ display: "flex" }}>share.carter.md</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: size_,
              letterSpacing: -1.5,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {description && (
            <div style={{ display: "flex", fontSize: 32, color: INK_MUTED, lineHeight: 1.3 }}>
              {description}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 72, height: 2, background: ACCENT }} />
          <div
            style={{
              display: "flex",
              paddingTop: 26,
              borderTop: `1px solid ${RULE}`,
              fontFamily: "IBM Plex Mono",
              fontSize: 24,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: INK_MUTED,
            }}
          >
            Shared by Carter Crouch
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
