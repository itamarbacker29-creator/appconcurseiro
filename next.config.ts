import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // react-pdf (pdf.js) optionally uses canvas for server-side rendering — not needed in browser
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
