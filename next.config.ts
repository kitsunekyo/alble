import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  // Keep the native libsql client out of the server bundle. Bundling it costs
  // minutes on the first dev request (Turbopack), which stalls every API call
  // queued behind it — the app looks frozen right after `pnpm dev`.
  // `drizzle-orm` is the expensive one: its barrel of dialects takes ~2 minutes
  // to compile the first time, so every request (including navigations) waits.
  serverExternalPackages: ["@libsql/client", "libsql", "@neon-rs/load", "drizzle-orm"],
};

export default withSerwist(nextConfig);
