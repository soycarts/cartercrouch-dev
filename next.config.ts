import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Keep the profile photo out of image-search indexes (both the raw file
    // and the next/image optimizer URL) while leaving it visible on the page.
    const noImageIndex = [{ key: "X-Robots-Tag", value: "noimageindex" }];
    return [
      { source: "/profile.jpeg", headers: noImageIndex },
      {
        source: "/_next/image",
        has: [{ type: "query", key: "url", value: "/profile.jpeg" }],
        headers: noImageIndex,
      },
    ];
  },
};

export default nextConfig;
