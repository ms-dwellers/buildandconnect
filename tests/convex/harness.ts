/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { register } from "@convex-dev/better-auth/test";
import schema from "../../convex/schema";
import { api, components } from "../../convex/_generated/api";
import {
  developer,
  opportunity,
  analysis,
  embedding,
} from "../fixtures/matching";
import type { Role } from "../../backend/schemas";

export { api, components, analysis, embedding };

export const secret = "local-test-bridge-not-a-real-credential";
const modules = import.meta.glob("../../convex/**/*.ts");

function profileOf({
  id: _id,
  name: _name,
  embedding: _embedding,
  location: _location,
  recentExposure: _exposure,
  ...rest
}: typeof developer) {
  return rest;
}
function jobOf({
  id: _id,
  ownerId: _ownerId,
  analysis: _analysis,
  embedding: _embedding,
  status: _status,
  ...rest
}: typeof opportunity) {
  return rest;
}
export const profile = profileOf(developer);
export const job = jobOf(opportunity);

export function setup() {
  const t = convexTest(schema, modules);
  register(t);
  return t;
}
export async function actor(t: ReturnType<typeof setup>, role: Role) {
  const user = await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: role,
          email: `${crypto.randomUUID()}@example.test`,
          emailVerified: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    }),
  );
  const session = await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: user._id,
          token: crypto.randomUUID(),
          expiresAt: Date.now() + 60000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    }),
  );
  const client = t.withIdentity({ subject: user._id, sessionId: session._id });
  await client.mutation(api.data.setRole, { secret, role });
  return { client, id: user._id, sessionId: session._id };
}
