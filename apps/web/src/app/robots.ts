import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/play/", "/social", "/create/"] },
    sitemap: "https://life.endemion.online/sitemap.xml"
  };
}
