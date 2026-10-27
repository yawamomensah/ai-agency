import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["3000-firebase-c-compiler-project-1778731001512.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev",
    "sinister-spooky-spirit-wpx9x94vr79259xv-3000.app.github.dev"
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "localhost:3000"],
    },
  },
};

export default nextConfig;