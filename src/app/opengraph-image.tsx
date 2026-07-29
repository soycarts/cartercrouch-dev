import { ImageResponse } from "next/og";
import { profile } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${profile.name} — ${profile.tagline}`;

// Mirrors the site's paper palette. next/og has no access to the CSS tokens,
// so these values are duplicated from globals.css by hand — keep them in sync.
const PAPER = "#fcfbf9";
const INK = "#171614";
const INK_MUTED = "#7a736e";
const RULE = "#e2dfda";

export default function OpenGraphImage() {
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
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingBottom: 28,
            borderBottom: `1px solid ${RULE}`,
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          <div style={{ display: "flex", color: INK }}>CC</div>
          <div style={{ display: "flex" }}>cartercrouch.dev</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontSize: 96, letterSpacing: -2, lineHeight: 1 }}>
            {profile.name}
          </div>
          <div style={{ fontSize: 40, color: INK_MUTED, lineHeight: 1.2 }}>
            {profile.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            paddingTop: 28,
            borderTop: `1px solid ${RULE}`,
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          {profile.location}
        </div>
      </div>
    ),
    size,
  );
}
