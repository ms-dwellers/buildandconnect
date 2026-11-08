import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig(({ mode }) => ({
  worker: defineWorker({
    name: "buildandconnect",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-07",
    compatibilityFlags: ["nodejs_compat"],
    domains: mode === "production" ? ["buildandconnect.work"] : [],
    observability: { enabled: true, headSamplingRate: 1 },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      VITE_CONVEX_SITE_URL: process.env.VITE_CONVEX_SITE_URL
        ? bindings.text(process.env.VITE_CONVEX_SITE_URL)
        : bindings.secret(),
      SITE_URL:
        mode === "production"
          ? bindings.text("https://buildandconnect.work")
          : bindings.secret(),
    },
  }),
}));
