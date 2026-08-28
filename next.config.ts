import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El análisis puede tardar (scraping/LLM). Damos margen a las server actions/routes.
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
