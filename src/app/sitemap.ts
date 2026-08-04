import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://cartercrouch.dev",
      lastModified: new Date(),
    },
    {
      url: "https://cartercrouch.dev/quests",
      lastModified: new Date(),
    },
  ];
}
