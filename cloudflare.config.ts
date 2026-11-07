import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "buildandconnect",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-07",
    compatibilityFlags: ["nodejs_compat"],
    observability: { enabled: true, headSamplingRate: 1 },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({
        name: "buildandconnect",
        id:
          process.env.D1_DATABASE_ID ?? "00000000-0000-4000-8000-000000000001",
      }),
      AI: bindings.ai(),
      BETTER_AUTH_SECRET: bindings.secret(),
      SITE_URL: bindings.secret(),
    },
  }),
});
