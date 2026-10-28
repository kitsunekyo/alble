import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  // Keep the native libsql client out of the server bundle. Bundling it costs
  // minutes on the first dev request (Turbopack), which stalls every API call
  // queued behind it — the app looks frozen right after `pnpm dev`.
  serverExternalPackages: ["@libsql/client", "libsql", "@neon-rs/load"],
};

export default withSerwist(nextConfig);
