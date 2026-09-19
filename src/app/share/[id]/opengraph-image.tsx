import { ImageResponse } from "next/og";
import { getStore, getPublicDocument } from "@/lib/share";
import { renderDocument } from "@/lib/share/markdown";
import { PAPER, INK, INK_MUTED, RULE, ACCENT, loadOgFonts } from "@/app/og-fonts/shared";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Carter / Share";

// Branded card for Telegram and friends: title, lede, CARTER / SHARE.
export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getPublicDocument(getStore(), id);
  const rendered = doc ? await renderDocument(doc.markdown) : null;
  const title = rendered?.title ?? (doc ? "Untitled document" : "Document not found");
  const description = rendered?.description ?? "";
  const titleSize = title.length > 48 ? 56 : title.length > 28 ? 72 : 88;

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
          <div style={{ display: "flex", color: INK }}>Carter / Share</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 10, height: 10, background: ACCENT }} />
            <div style={{ display: "flex" }}>share.carter.md</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: titleSize, letterSpacing: -1.5, lineHeight: 1.05 }}>
            {title}
          </div>
          {description && (
            <div style={{ fontSize: 34, color: INK_MUTED, lineHeight: 1.25 }}>
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
