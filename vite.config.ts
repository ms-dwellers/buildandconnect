import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Pre-bundle three so the first visit to the home page never triggers a
  // dependency re-optimisation reload in development.
  optimizeDeps: { include: ["three"] },
  plugins: [
    vinext(),
    cloudflare({
      remoteBindings: process.env.WORKERS_AI_REMOTE === "true",
      persistState: { path: ".wrangler/state" },
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
