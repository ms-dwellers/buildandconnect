import { env } from "cloudflare:workers";
import { forwardToConvex } from "../../../lib/convex-proxy.ts";

const handle = (request: Request) => forwardToConvex(request, env);

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as OPTIONS,
};
