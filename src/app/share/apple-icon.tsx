import { ImageResponse } from "next/og";
import { PAPER, INK, loadOgFonts } from "@/app/og-fonts/shared";

// The same CC monogram as the site's apple-icon, mounted under /share so it
// is served at /share/apple-icon. On share.carter.md the bare /apple-icon
// path is swallowed by the host catch-all rewrite; /share/* is not.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function ShareAppleIcon() {
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
