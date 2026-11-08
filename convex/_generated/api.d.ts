/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as ai from "../ai.js";
import type * as api_ from "../api.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as data from "../data.js";
import type * as demoReset from "../demoReset.js";
import type * as domain from "../domain.js";
import type * as hiring_env from "../hiring/env.js";
import type * as hiring_providers from "../hiring/providers.js";
import type * as hiring_routes from "../hiring/routes.js";
import type * as hiring_service from "../hiring/service.js";
import type * as http from "../http.js";
import type * as maintenance from "../maintenance.js";
import type * as router from "../router.js";
import type * as socialProviders from "../socialProviders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  ai: typeof ai;
  api: typeof api_;
  auth: typeof auth;
  chat: typeof chat;
  data: typeof data;
  demoReset: typeof demoReset;
  domain: typeof domain;
  "hiring/env": typeof hiring_env;
  "hiring/providers": typeof hiring_providers;
  "hiring/routes": typeof hiring_routes;
  "hiring/service": typeof hiring_service;
  http: typeof http;
  maintenance: typeof maintenance;
  router: typeof router;
  socialProviders: typeof socialProviders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
