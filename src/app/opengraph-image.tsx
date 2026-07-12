import { ImageResponse } from "next/og";
import { profile } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${profile.name} — ${profile.tagline}`;

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
          background:
            "radial-gradient(48rem 48rem at 85% -10%, rgba(52, 211, 153, 0.14), transparent 60%), #0a0a0b",
          color: "#ededed",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 9999,
              background: "#34d399",
            }}
          />
          cartercrouch.dev
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -3 }}>
            {profile.name}
          </div>
          <div style={{ fontSize: 40, color: "#a1a1aa" }}>
            {profile.tagline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#71717a" }}>
          {profile.location}
        </div>
      </div>
    ),
    size,
  );
}
