import type { NextConfig } from "next";

/** Optional cloud object-storage host for product media (e.g. a CDN bucket domain). */
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

/** Images uploaded through the admin panel are served by the API (`/uploads/media/...`) in local development. */
const apiUrl = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL) : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Allows the local API (localhost) as an image source during development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      // Demo photography. Replace with the business's own media host.
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(mediaHost ? [{ protocol: "https" as const, hostname: mediaHost }] : []),
      ...(apiUrl
        ? [{ protocol: apiUrl.protocol.replace(":", "") as "http" | "https", hostname: apiUrl.hostname, port: apiUrl.port, pathname: "/uploads/**" }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
