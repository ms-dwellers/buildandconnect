/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import authSchema from "../../node_modules/@convex-dev/better-auth/src/component/schema";
import fixtureHttp from "../fixtures/convex-http";

// Resolve modules before Convex enters its query/mutation sandbox. Vite's lazy
// module loader uses timers, which correctly cannot execute inside a mutation.
const modules = import.meta.glob(
  ["../../convex/**/*.ts", "!**/convex.config.ts"],
  { eager: true },
);
const authModules = import.meta.glob(
  [
    "../../node_modules/@convex-dev/better-auth/src/component/**/*.ts",
    "!**/*.test.ts",
    "!**/convex.config.ts",
  ],
  { eager: true },
);
const loaders = (modules: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(modules).map(([name, module]) => [
      name,
      () => Promise.resolve(module),
    ]),
  );
const runtime = convexTest(schema, {
  ...loaders(modules),
  "../../convex/http.ts": () => Promise.resolve({ default: fixtureHttp }),
});
runtime.registerComponent("betterAuth", authSchema, loaders(authModules));
export default runtime;
