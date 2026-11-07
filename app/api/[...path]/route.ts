import { env } from "cloudflare:workers";
import { createApi } from "../../../backend/api.ts";

const api = createApi();
const handle = (request: Request) => api.fetch(request, env);

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as OPTIONS,
};
