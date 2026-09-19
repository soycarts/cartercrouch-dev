import { ImageResponse } from "next/og";
import { profile } from "@/lib/data";
import {
  PAPER,
  INK,
  INK_MUTED,
  RULE,
  ACCENT,
  loadOgFonts,
} from "../og-fonts/shared";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${profile.name} — ${profile.tagline}`;

export default async function OpenGraphImage() {
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
          <div style={{ display: "flex", color: INK }}>CC</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 10, height: 10, background: ACCENT }} />
            <div style={{ display: "flex" }}>cartercrouch.dev</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontSize: 100, letterSpacing: -2, lineHeight: 1 }}>
            {profile.name}
          </div>
          <div style={{ fontSize: 40, color: INK_MUTED, lineHeight: 1.2 }}>
            {profile.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
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
            {profile.location}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
