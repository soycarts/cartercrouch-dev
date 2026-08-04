import { ImageResponse } from "next/og";
import { quests } from "@/lib/data";
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
export const alt = "Quests — Carter Crouch's quest board: running, queued, and completed.";

// Mirrors the status chips on the quests page.
const chipStyle = {
  running: { background: "rgba(10, 107, 83, 0.1)", color: ACCENT },
  queued: { background: "rgba(23, 22, 20, 0.05)", color: INK_MUTED },
  completed: { background: INK, color: PAPER },
} as const;

export default async function OpenGraphImage() {
  const counts = (["running", "queued", "completed"] as const).map(
    (status) => ({
      status,
      count: quests.filter((q) => q.status === status).length,
    }),
  );

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

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div
            style={{
              fontFamily: "IBM Plex Mono",
              fontSize: 24,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: INK_MUTED,
            }}
          >
            Quest board
          </div>
          <div style={{ fontSize: 100, letterSpacing: -2, lineHeight: 1 }}>
            Quests
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            {counts.map(({ status, count }) => (
              <div
                key={status}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  fontFamily: "IBM Plex Mono",
                  fontSize: 24,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  ...chipStyle[status],
                }}
              >
                <div style={{ display: "flex" }}>{status}</div>
                <div style={{ display: "flex" }}>{count}</div>
              </div>
            ))}
          </div>
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
            {quests.length} quests / and counting
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
