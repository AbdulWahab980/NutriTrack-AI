import type { NextConfig } from "next";

/**
 * Baseline security headers. This app handles health data, so the defaults
 * matter more than usual.
 */
const securityHeaders = [
  // Clickjacking: nothing here should ever be framed.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Stop browsers guessing content types (e.g. treating the CSV export as HTML).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the path of a health app in referrers to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No feature needs these.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Only meaningful over HTTPS; ignored by browsers on http://localhost.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Meal photos are downscaled client-side, but the base64 data URL still
  // needs more than the 1MB server-action default.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Personal data must never be cached by a proxy or the browser.
      {
        source: "/api/export",
        headers: [{ key: "Cache-Control", value: "no-store, private" }],
      },
    ];
  },
};

export default nextConfig;
