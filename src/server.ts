import { serve } from "bun";
import index from "./index.html";
import { runMigrations } from "./server/db/client";
import { apiRoutes } from "./server/api";

runMigrations();

const port = Number(process.env.PORT ?? 3000);

const server = serve({
  hostname: "0.0.0.0",
  port,
  routes: {
    ...apiRoutes,
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🐶 Alble running at ${server.url}`);
