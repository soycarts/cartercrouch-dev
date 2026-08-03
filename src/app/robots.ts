import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/profile.jpeg" },
    sitemap: "https://cartercrouch.dev/sitemap.xml",
  };
}
