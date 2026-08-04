import { ImageResponse } from "next/og";
import { PAPER, INK, loadOgFonts } from "./og-fonts/shared";

// ImageResponse counterpart of icon.svg — iOS ignores SVG favicons.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          color: PAPER,
          fontFamily: "IBM Plex Mono",
          fontSize: 80,
          letterSpacing: 2,
        }}
      >
        CC
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
