import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer as createViteServer } from "vite";
import { developer, opportunity } from "../fixtures/matching.ts";

// Ephemeral, loopback-only Convex test runtime. Never connects to any cloud database.
const port = Number(process.env.NATIVE_TEST_PORT ?? 5199);
const origin = `http://127.0.0.1:${port}`;
process.env.SITE_URL = origin;
process.env.CONVEX_SITE_URL = origin;
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("base64url");
process.env.WORKERS_AI_ENABLED = "false";
const vite = await createViteServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  ssr: { noExternal: ["@convex-dev/better-auth"] },
});
const { default: runtime } = await vite.ssrLoadModule(
  "/tests/native/runtime.ts",
);

let nextIP = 10;
async function call(path, { method = "GET", body, token, cookie } = {}) {
  const response = await runtime.fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "x-forwarded-for": `192.0.2.${nextIP++}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
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

let nextProfileResponse;
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
    if (
      request.url === "/__test/profile-response" &&
      request.method === "POST"
    ) {
      nextProfileResponse = JSON.parse(Buffer.concat(chunks).toString());
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
      return;
    }
    if (request.url === "/api/developers/me" && request.method === "GET") {
      const override = nextProfileResponse;
      nextProfileResponse = undefined;
      if (override?.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, override.delayMs));
      }
      if (override?.status) {
        response.writeHead(override.status, {
          "Content-Type": "application/json",
        });
        response.end(
          JSON.stringify({ error: "Unable to load profile. Try again." }),
        );
        return;
      }
    }
    const result = await runtime.fetch(request.url, {
      method: request.method,
      headers: {
        ...request.headers,
        "x-forwarded-for": `198.51.100.${nextIP++ % 250}`,
      },
      ...(["GET", "HEAD"].includes(request.method)
        ? {}
        : { body: Buffer.concat(chunks) }),
    });
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
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Native verification API ready at ${origin}. Ephemeral Convex test runtime; synthetic data and substituted AI, no cloud services.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    server.close();
    await vite.close();
    process.exit(0);
  });
