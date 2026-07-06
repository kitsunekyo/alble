import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
};

export default withSerwist(nextConfig);
