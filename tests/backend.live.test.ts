import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

test(
  "direct deployed Convex HTTP authentication without a web server",
  { skip: process.env.CONVEX_LIVE_TESTS !== "1", timeout: 60_000 },
  async (t) => {
    assert.match(process.env.CONVEX_DEPLOYMENT ?? "", /^dev:/);
    assert.ok(!process.env.CONVEX_DEPLOY_KEY);
    const base = process.env.VITE_CONVEX_SITE_URL!;
    assert.ok(base);
    const headers = { "Content-Type": "application/json", Origin: base };
    const result = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Native verification",
        email: `${randomUUID()}@example.test`,
        password: randomBytes(24).toString("hex"),
      }),
    });
    assert.equal(result.status, 200);
    const user = (await result.json()) as { user: { id: string } };
    t.after(() => {
      const result = spawnSync(
        process.execPath,
        [
          "node_modules/convex/bin/main.js",
          "run",
          "maintenance:cleanupVerification",
          JSON.stringify({ userIds: [user.user.id] }),
        ],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 0, "Verification account cleanup failed");
    });
    const token = result.headers.get("set-auth-token");
    assert.ok(token);
    const authenticated = { ...headers, Authorization: `Bearer ${token}` };
    assert.equal(
      (await fetch(`${base}/api/me`, { headers: authenticated })).status,
      200,
    );
    for (const role of ["company", "recruiter"]) {
      assert.equal(
        (
          await fetch(`${base}/api/me/role`, {
            method: "PUT",
            headers: authenticated,
            body: JSON.stringify({ role }),
          })
        ).status,
        400,
      );
    }
    assert.equal(
      (
        await fetch(`${base}/api/me/role`, {
          method: "PUT",
          headers: authenticated,
          body: JSON.stringify({ role: "requester" }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/auth/sign-out`, {
          method: "POST",
          headers: authenticated,
          body: "{}",
        })
      ).status,
      200,
    );
    assert.equal(
      (await fetch(`${base}/api/me`, { headers: authenticated })).status,
      401,
    );
  },
);
