import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://life.endemion.online", changeFrequency: "weekly", priority: 1 },
    { url: "https://life.endemion.online/worlds", changeFrequency: "weekly", priority: 0.8 }
  ];
}
