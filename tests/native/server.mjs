import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { developer, opportunity } from "../fixtures/matching.ts";

// Opt-in simulator harness. Never point test accounts or substituted inference at cloud data.
if (
  !process.env.CONVEX_DEPLOYMENT?.startsWith("anonymous:") ||
  process.env.VITE_CONVEX_URL !== "http://127.0.0.1:3230" ||
  process.env.VITE_CONVEX_SITE_URL !== "http://127.0.0.1:3231"
)
  throw new Error(
    "Native verification requires the isolated local deployment on 3230/3231.",
  );

const bundle = await build({
  entryPoints: ["tests/fixtures/api-worker.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  mainFields: ["module", "main"],
  conditions: ["workerd", "worker", "browser"],
  external: ["node:*", "cloudflare:*"],
  target: "esnext",
});
const runtime = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-11-07",
    compatibilityFlags: ["nodejs_compat"],
    bindings: {
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
      VITE_CONVEX_SITE_URL: process.env.VITE_CONVEX_SITE_URL,
      CONVEX_BRIDGE_SECRET: process.env.CONVEX_BRIDGE_SECRET,
      SITE_URL: "http://127.0.0.1:5199",
    },
  }),
);

let nextIP = 10;
async function call(path, { method = "GET", body, token, cookie } = {}) {
  const response = await runtime.dispatchFetch(
    `http://127.0.0.1:5199/api${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5199",
        "CF-Connecting-IP": `192.0.2.${nextIP++}`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  const data = await response.clone().json();
  if (!response.ok)
    throw new Error(
      `${method} ${path}: ${response.status} ${data.error ?? data.message ?? "request failed"}`,
    );
  return { data, response };
}

const context = {};
const runId = randomUUID().slice(0, 6);
context.opportunityTitle = `Community garden website ${runId}`;
context.requestTitle = `Neighborhood garden calendar ${runId}`;
const sessions = {};
for (const role of ["developer", "requester", "company", "recruiter"]) {
  const email = `iphone-${role}-${randomUUID()}@example.test`;
  const password = randomBytes(24).toString("base64url");
  const { data, response } = await call("/auth/sign-up/email", {
    method: "POST",
    body: { name: `iPhone ${role}`, email, password },
  });
  const token = response.headers.get("set-auth-token");
  if (!token) throw new Error("Native session header is missing");
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  sessions[role] = { token, cookie };
  await call("/me/role", { method: "PUT", body: { role }, token });
  context[role] = { email, password, id: data.user.id };
}
const { id, name, embedding, recentExposure, location, ...profile } = developer;
await call("/developers/me", {
  method: "PUT",
  body: { ...profile, city: "Calgary" },
  ...sessions.developer,
});
await call("/developers/me/location", {
  method: "PATCH",
  body: { latitude: 51.052512, longitude: -114.086531, radiusKm: 25 },
  ...sessions.developer,
});
const {
  id: jobId,
  ownerId,
  analysis,
  embedding: jobEmbedding,
  status,
  ...details
} = opportunity;
const created = await call("/opportunities", {
  method: "POST",
  ...sessions.company,
  body: {
    ...details,
    title: context.opportunityTitle,
    city: "Calgary",
    place: "Kensington",
    latitude: 51.052512,
    longitude: -114.086531,
  },
});
context.opportunityId = created.data.id;
await call(`/opportunities/${context.opportunityId}/interest`, {
  method: "PUT",
  ...sessions.company,
  body: { developerId: context.developer.id, interested: true },
});
const request = await call("/requests", {
  method: "POST",
  ...sessions.requester,
  body: {
    title: context.requestTitle,
    description:
      "Help our community garden build an accessible calendar for volunteer planting days.",
    place: "Kensington community garden",
    latitude: 51.052512,
    longitude: -114.086531,
  },
});
context.requestId = request.data.id;

const server = createServer(async (request, response) => {
  try {
    if (request.url === "/__test/context") {
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(context));
      return;
    }
    if (
      request.url === "/__test/company-interest" &&
      request.method === "POST"
    ) {
      await call(`/opportunities/${context.opportunityId}/interest`, {
        method: "PUT",
        ...sessions.company,
        body: { developerId: context.developer.id, interested: true },
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
      return;
    }
    if (request.url === "/__test/claim" && request.method === "POST") {
      await call(`/requests/${context.requestId}/accept`, {
        method: "POST",
        ...sessions.developer,
        body: {},
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const result = await runtime.dispatchFetch(
      `http://127.0.0.1:5199${request.url}`,
      {
        method: request.method,
        headers: {
          ...request.headers,
          "CF-Connecting-IP": `198.51.100.${nextIP++ % 250}`,
        },
        ...(["GET", "HEAD"].includes(request.method)
          ? {}
          : { body: Buffer.concat(chunks) }),
      },
    );
    const headers = Object.fromEntries(result.headers);
    const cookies = result.headers.getSetCookie();
    if (cookies.length) headers["set-cookie"] = cookies;
    response.writeHead(result.status, headers);
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ error: "Local verification request failed" }),
    );
  }
});
server.listen(5199, "127.0.0.1", () =>
  console.log(
    "Native verification API ready at http://127.0.0.1:5199. Real local Convex; only AI inference is substituted.",
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    server.close();
    await runtime.dispose();
    process.exit(0);
  });
