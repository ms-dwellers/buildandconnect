import { bindings, defineConfig, defineWorker } from "cf/config";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_SCRIBE_MODEL,
} from "./backend/hiring/models.ts";

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
      AI: bindings.ai(),
      VITE_CONVEX_URL: bindings.secret(),
      VITE_CONVEX_SITE_URL: bindings.secret(),
      CONVEX_BRIDGE_SECRET: bindings.secret(),
      SITE_URL: bindings.secret(),
      OPENROUTER_API_KEY: bindings.secret(),
      OPENROUTER_MODEL: bindings.text(
        process.env.OPENROUTER_MODEL || DEFAULT_GEMINI_MODEL,
      ),
      ELEVENLABS_API_KEY: bindings.secret(),
      ELEVENLABS_STT_MODEL: bindings.text(
        process.env.ELEVENLABS_STT_MODEL || DEFAULT_SCRIBE_MODEL,
      ),
    },
  }),
});
