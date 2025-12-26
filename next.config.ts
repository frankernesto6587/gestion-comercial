import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone para Docker
  output: "standalone",

  // Configuración de imágenes si se usan
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
