import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";
const basePath = isStaticExport
  ? process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ""
  : "";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  trailingSlash: isStaticExport,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: isStaticExport && basePath ? basePath : undefined,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
