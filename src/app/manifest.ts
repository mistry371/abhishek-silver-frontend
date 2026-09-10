import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#1b1916",
    icons: [{ src: siteConfig.logo.url, sizes: `${siteConfig.logo.width}x${siteConfig.logo.height}`, type: "image/jpeg" }],
  };
}
