import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Payment confirmation uploads a transfer screenshot (capped at 4 MB in
      // lib/admin/payment-proof.ts); leave room for multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
