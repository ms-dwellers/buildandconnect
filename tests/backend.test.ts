import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { developer, opportunity } from "./fixtures/matching.ts";

test(
  "backend HTTP pipeline with real Better Auth, workerd, and D1",
  { timeout: 120_000 },
  async (t) => {
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
        d1Databases: ["DB"],
        bindings: {
          BETTER_AUTH_SECRET: randomBytes(48).toString("base64"),
          SITE_URL: "http://localhost",
        },
      }),
    );
    t.after(() => runtime.dispose());
    const db = await runtime.getD1Database("DB");
    const migration = await readFile(
      new URL("../migrations/0001_backend.sql", import.meta.url),
      "utf8",
    );
    const statements = migration
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    await db.batch(statements.map((statement) => db.prepare(statement)));
    // Reapplying the initial migration must not destroy records or fail.
    await db.batch(statements.map((statement) => db.prepare(statement)));

    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      cookie?: string,
      origin = "http://localhost",
      ip = "192.0.2.1",
    ) =>
      runtime.dispatchFetch(`http://localhost/api${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          "CF-Connecting-IP": ip,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    let nextIP = 10;
    async function signup(role: string, name: string) {
      const result = await request(
        "/auth/sign-up/email",
        "POST",
        {
          name,
          email: `${crypto.randomUUID()}@example.test`,
          password: randomBytes(24).toString("hex"),
        },
        undefined,
        "http://localhost",
        `192.0.2.${nextIP++}`,
      );
      assert.equal(result.status, 200, await result.clone().text());
      const cookie = result.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      assert.ok(cookie);
      const json = (await result.json()) as { user: { id: string } };
      assert.equal(
        (await request("/me/role", "PUT", { role }, cookie)).status,
        200,
      );
      return { cookie, id: json.user.id };
    }
    assert.equal((await request("/opportunities")).status, 401);
    const company = await signup("company", "Garden Company");
    const otherCompany = await signup("company", "Other Company");
    const junior = await signup("developer", "Junior Developer");
    const recruiter = await signup("recruiter", "Recruiter");
    assert.equal(
      (await request("/me/role", "PUT", { role: "company" }, junior.cookie))
        .status,
      409,
    );
    assert.equal(
      (
        await request(
          "/me/role",
          "PUT",
          { role: "developer" },
          junior.cookie,
          "https://attacker.test",
        )
      ).status,
      403,
    );

    const {
      id: _id,
      name: _name,
      embedding: _embedding,
      recentExposure: _recent,
      ...profile
    } = developer;
    assert.equal(
      (
        await request(
          "/developers/me",
          "PUT",
          { ...profile, bio: "AI_UNAVAILABLE model failure" },
          junior.cookie,
        )
      ).status,
      503,
    );
    assert.equal(
      (await request("/developers/me", "GET", undefined, junior.cookie)).status,
      404,
    );
    assert.equal(
      (
        await request(
          "/developers/me",
          "PUT",
          { ...profile, recentExposure: 0 },
          junior.cookie,
        )
      ).status,
      400,
    );
    assert.equal(
      (await request("/developers/me", "PUT", profile, junior.cookie)).status,
      200,
    );

    const {
      id: _oid,
      ownerId: _owner,
      analysis: _analysis,
      embedding: _oe,
      status: _status,
      ...job
    } = opportunity;
    assert.equal(
      (await request("/opportunities", "POST", job, junior.cookie)).status,
      403,
    );
    assert.equal(
      (
        await request(
          "/opportunities",
          "POST",
          { ...job, description: "AI_UNAVAILABLE job analysis failure" },
          company.cookie,
        )
      ).status,
      503,
    );
    assert.equal(
      (
        await db
          .prepare("SELECT count(*) AS count FROM opportunity")
          .first<{ count: number }>()
      )?.count,
      0,
    );
    const created = await request(
      "/opportunities",
      "POST",
      job,
      company.cookie,
    );
    assert.equal(created.status, 201, await created.clone().text());
    const { id } = (await created.json()) as { id: string };
    const path = `/opportunities/${id}`;
    assert.equal(
      (
        (await (
          await request(
            "/opportunities?city=Toronto&kind=volunteer",
            "GET",
            undefined,
            junior.cookie,
          )
        ).json()) as { data: unknown[] }
      ).data.length,
      1,
    );
    assert.equal(
      (
        (await (
          await request(
            "/opportunities?city=Ottawa",
            "GET",
            undefined,
            junior.cookie,
          )
        ).json()) as { data: unknown[] }
      ).data.length,
      0,
    );
    assert.equal(
      (await request(`${path}/matches`, "GET", undefined, otherCompany.cookie))
        .status,
      403,
    );
    assert.equal(
      (await request(`${path}/matches`, "GET", undefined, recruiter.cookie))
        .status,
      403,
    );
    const matches = await request(
      `${path}/matches`,
      "GET",
      undefined,
      company.cookie,
    );
    const matchText = await matches.text();
    const ranked = JSON.parse(matchText) as {
      data: { developerId: string; score: number }[];
    };
    assert.equal(ranked.data[0].developerId, junior.id);
    assert.equal(ranked.data[0].score, 100);
    assert.equal(matches.headers.get("Cache-Control"), "no-store");
    assert.ok(!/password|embedding|email/.test(matchText));
    assert.equal(
      (await request("/developers?limit=0", "GET", undefined, recruiter.cookie))
        .status,
      400,
    );
    const discovery = await request(
      "/developers",
      "GET",
      undefined,
      recruiter.cookie,
    );
    const publicProfiles = await discovery.text();
    assert.match(publicProfiles, /Garden site/);
    assert.ok(!/email|embedding|recentExposure|password/.test(publicProfiles));

    assert.equal(
      (
        await request(
          `${path}/interest`,
          "PUT",
          { developerId: junior.id, interested: true },
          otherCompany.cookie,
        )
      ).status,
      403,
    );
    const interest = await request(
      `${path}/interest`,
      "PUT",
      { developerId: junior.id, interested: true },
      company.cookie,
    );
    assert.equal(
      ((await interest.json()) as { connected: boolean }).connected,
      false,
    );
    const pendingInterest = await request(
      "/interests",
      "GET",
      undefined,
      junior.cookie,
    );
    const pending = (await pendingInterest.json()) as {
      data: {
        companyInterested: boolean;
        developerInterested: boolean;
        connected: boolean;
      }[];
    };
    assert.equal(pending.data.length, 1);
    assert.equal(pending.data[0].companyInterested, true);
    assert.equal(pending.data[0].developerInterested, false);
    assert.equal(pending.data[0].connected, false);
    const mutual = await request(
      `${path}/interest`,
      "PUT",
      { interested: true },
      junior.cookie,
    );
    assert.equal(
      ((await mutual.json()) as { connected: boolean }).connected,
      true,
    );
    await request(
      `${path}/interest`,
      "PUT",
      { interested: true },
      junior.cookie,
    );
    assert.equal(
      (
        await db
          .prepare("SELECT count(*) AS count FROM interest")
          .first<{ count: number }>()
      )?.count,
      1,
    );
    const connections = await request(
      "/connections",
      "GET",
      undefined,
      junior.cookie,
    );
    assert.equal(
      ((await connections.json()) as { data: unknown[] }).data.length,
      1,
    );
    assert.equal(
      (
        (await (
          await request("/connections", "GET", undefined, otherCompany.cookie)
        ).json()) as { data: unknown[] }
      ).data.length,
      0,
    );
    await request(
      `${path}/interest`,
      "PUT",
      { interested: false },
      junior.cookie,
    );
    assert.equal(
      (
        (await (
          await request("/connections", "GET", undefined, junior.cookie)
        ).json()) as { data: unknown[] }
      ).data.length,
      0,
    );
    assert.equal(
      (
        await db
          .prepare(
            "SELECT count(*) AS count FROM interest WHERE first_company_interest_at IS NOT NULL",
          )
          .first<{ count: number }>()
      )?.count,
      1,
    );

    // Opting out removes the profile from both recruiter discovery and ranking.
    await request(
      "/developers/me",
      "PATCH",
      { discoverable: false },
      junior.cookie,
    );
    const hidden = await request(
      "/developers/me",
      "GET",
      undefined,
      junior.cookie,
    );
    const hiddenProfile = (await hidden.json()) as {
      discoverable: boolean;
      available: boolean;
    };
    assert.equal(hiddenProfile.discoverable, false);
    assert.equal(hiddenProfile.available, true);
    assert.equal(
      (
        (await (
          await request(`${path}/matches`, "GET", undefined, company.cookie)
        ).json()) as { data: unknown[] }
      ).data.length,
      0,
    );
    assert.equal(
      (
        (await (
          await request("/developers", "GET", undefined, recruiter.cookie)
        ).json()) as { data: unknown[] }
      ).data.length,
      0,
    );
    assert.equal(
      (
        await request(
          `${path}/interest`,
          "PUT",
          { developerId: junior.id, interested: true },
          company.cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (await request(path, "PATCH", { status: "closed" }, company.cookie))
        .status,
      200,
    );
    assert.equal(
      (await request(path, "PATCH", { status: "open" }, otherCompany.cookie))
        .status,
      403,
    );
    assert.equal(
      (
        await request(
          "/opportunities/missing",
          "GET",
          undefined,
          company.cookie,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          "/developers/me",
          "PUT",
          { bio: "x".repeat(40_000) },
          junior.cookie,
        )
      ).status,
      413,
    );
    assert.equal(
      (await request("/auth/sign-out", "POST", {}, junior.cookie)).status,
      200,
    );
    assert.equal(
      (await request("/me", "GET", undefined, junior.cookie)).status,
      401,
    );
  },
);
