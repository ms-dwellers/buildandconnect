import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { handleApi, type AnalysisServices } from "./api";

export function createHttpRouter(services?: AnalysisServices) {
  const http = httpRouter();
  authComponent.registerRoutes(http, createAuth);
  const handler = httpAction((ctx, request) =>
    handleApi(ctx, request, services),
  );
  for (const method of [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ] as const)
    http.route({ pathPrefix: "/api/", method, handler });
  return http;
}
