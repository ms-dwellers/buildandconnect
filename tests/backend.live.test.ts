import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { developer, opportunity } from "./fixtures/matching.ts";
import { careerTarget } from "./fixtures/career.ts";
import {
  emptyProjectDraft,
  type ProjectDraftRecord,
} from "../backend/project-drafts.ts";
import type {
  CareerRecommendations,
  SavedCareerTarget,
} from "../lib/career.ts";

test(
  "backend HTTP pipeline with real Better Auth, workerd, and Convex",
  { timeout: 180_000, skip: process.env.CONVEX_LIVE_TESTS !== "1" },
  async (t) => {
    assert.match(
      process.env.CONVEX_DEPLOYMENT ?? "",
      /^dev:/,
      "Live verification requires a selected development deployment",
    );
    assert.ok(
      !process.env.CONVEX_DEPLOY_KEY,
      "Live verification does not accept deploy keys",
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
          VITE_CONVEX_URL: process.env.VITE_CONVEX_URL!,
          VITE_CONVEX_SITE_URL: process.env.VITE_CONVEX_SITE_URL!,
          CONVEX_BRIDGE_SECRET: process.env.CONVEX_BRIDGE_SECRET!,
          SITE_URL: "http://127.0.0.1:5180",
        },
      }),
    );
    t.after(() => runtime.dispose());
    const createdUsers: string[] = [];
    t.after(() => {
      if (!createdUsers.length) return;
      const cleanup = spawnSync(
        process.execPath,
        [
          "node_modules/convex/bin/main.js",
          "run",
          "maintenance:cleanupVerification",
          JSON.stringify({ userIds: createdUsers }),
        ],
        { encoding: "utf8" },
      );
      assert.equal(
        cleanup.status,
        0,
        "Live verification account cleanup failed",
      );
    });
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      cookie?: string,
      origin = "http://127.0.0.1:5180",
      ip = "192.0.2.1",
    ) =>
      runtime.dispatchFetch(`http://127.0.0.1:5180/api${path}`, {
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
        "http://127.0.0.1:5180",
        `192.0.2.${nextIP++}`,
      );
      assert.equal(result.status, 200, await result.clone().text());
      const cookie = result.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      assert.ok(cookie);
      const json = (await result.json()) as { user: { id: string } };
      createdUsers.push(json.user.id);
      assert.equal(
        (await request("/me/role", "PUT", { role }, cookie)).status,
        200,
      );
      return { cookie, id: json.user.id };
    }
    assert.equal((await request("/opportunities")).status, 401);
    const company = await signup("requester", "Garden Requester");
    const otherCompany = await signup("requester", "Other Requester");
    const junior = await signup("developer", "Junior Developer");
    const recruiter = await signup("requester", "Discovery Requester");
    for (const removedRole of ["company", "recruiter"]) {
      assert.equal(
        (
          await request(
            "/me/role",
            "PUT",
            { role: removedRole },
            company.cookie,
          )
        ).status,
        400,
      );
    }
    assert.equal(
      (await request("/me/role", "PUT", { role: "requester" }, junior.cookie))
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
      location: _location,
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
        (await (
          await request("/opportunities", "GET", undefined, company.cookie)
        ).json()) as { data: unknown[] }
      ).data.length,
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
    const careerPath = "/developers/me/career-target";
    assert.equal((await request(careerPath)).status, 401);
    assert.equal(
      (await request(careerPath, "GET", undefined, company.cookie)).status,
      403,
    );
    assert.equal(
      await (await request(careerPath, "GET", undefined, junior.cookie)).json(),
      null,
    );
    const targetResponse = await request(
      careerPath,
      "PUT",
      {
        sourceText: careerTarget.sourceText,
        sourceUrl: "https://example.org/jobs/junior",
        expectedUpdatedAt: 0,
      },
      junior.cookie,
    );
    assert.equal(
      targetResponse.status,
      200,
      await targetResponse.clone().text(),
    );
    const savedTarget = (await targetResponse.json()) as SavedCareerTarget;
    assert.equal(savedTarget.developerId, junior.id);
    assert.equal(savedTarget.requirements[0].sourceQuote, "React");
    assert.deepEqual(
      await (await request(careerPath, "GET", undefined, junior.cookie)).json(),
      savedTarget,
    );
    assert.equal(
      (
        await request(
          careerPath,
          "PUT",
          { sourceText: careerTarget.sourceText, expectedUpdatedAt: 0 },
          junior.cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          careerPath,
          "PUT",
          {
            sourceText: "AI_UNAVAILABLE " + careerTarget.sourceText,
            expectedUpdatedAt: savedTarget.updatedAt,
          },
          junior.cookie,
        )
      ).status,
      503,
    );
    assert.deepEqual(
      await (await request(careerPath, "GET", undefined, junior.cookie)).json(),
      savedTarget,
    );
    const careerProjects = await request(
      "/developers/me/career-projects?limit=100",
      "GET",
      undefined,
      junior.cookie,
    );
    assert.equal(
      careerProjects.status,
      200,
      await careerProjects.clone().text(),
    );
    const recommendations =
      (await careerProjects.json()) as CareerRecommendations;
    assert.ok(recommendations.data.some((project) => project.id === id));
    assert.equal(recommendations.targetUpdatedAt, savedTarget.updatedAt);
    assert.equal(
      recommendations.requirements.find((item) => item.id === "degree")
        ?.evidenceStatus,
      "needs_evidence",
    );
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
    assert.ok(
      !/email|embedding|recentExposure|password|latitude|longitude|radiusKm/.test(
        publicProfiles,
      ),
    );

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
        requesterInterested: boolean;
        developerInterested: boolean;
        connected: boolean;
      }[];
    };
    assert.equal(pending.data.length, 1);
    assert.equal(pending.data[0].requesterInterested, true);
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
        (await (
          await request("/interests", "GET", undefined, junior.cookie)
        ).json()) as { data: unknown[] }
      ).data.length,
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
        (await (
          await request("/interests", "GET", undefined, junior.cookie)
        ).json()) as { data: unknown[] }
      ).data.length,
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

    await request(
      "/developers/me",
      "PATCH",
      { discoverable: true, available: true },
      junior.cookie,
    );
    const requester = await signup("requester", "Neighbor");
    const otherDeveloper = await signup("developer", "Other Developer");
    assert.equal(
      (await request("/developers/me", "PUT", profile, otherDeveloper.cookie))
        .status,
      200,
    );
    assert.equal(
      (
        await request(
          "/developers/me/location",
          "PATCH",
          developer.location,
          otherDeveloper.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/developers/me/location",
          "PATCH",
          developer.location,
          junior.cookie,
        )
      ).status,
      200,
    );
    const ownProfile = await request(
      "/developers/me",
      "GET",
      undefined,
      junior.cookie,
    );
    assert.match(await ownProfile.clone().text(), /latitude/);
    assert.equal(
      (
        await request(
          "/requests",
          "POST",
          {
            title: "Fix garden site",
            description:
              "Need help building an accessible garden website with React for neighbors nearby.",
            place: "Toronto Downtown",
            latitude: 43.66,
            longitude: -79.38,
          },
          junior.cookie,
        )
      ).status,
      403,
    );
    const posted = await request(
      "/requests",
      "POST",
      {
        title: "Fix garden site",
        description:
          "Need help building an accessible garden website with React for neighbors nearby.",
        place: "Toronto Downtown",
        latitude: 43.66,
        longitude: -79.38,
      },
      requester.cookie,
    );
    assert.equal(posted.status, 201, await posted.clone().text());
    const localRequest = (await posted.json()) as { id: string };
    const nearby = await request(
      "/requests/nearby",
      "GET",
      undefined,
      junior.cookie,
    );
    const nearbyBody = (await nearby.json()) as {
      data: { requestId: string; score: number }[];
    };
    assert.equal(nearby.status, 200, JSON.stringify(nearbyBody));
    assert.equal(nearbyBody.data[0]?.requestId, localRequest.id);
    assert.ok(!JSON.stringify(nearbyBody).includes("embedding"));
    const firstAccept = await request(
      `/requests/${localRequest.id}/accept`,
      "POST",
      {},
      junior.cookie,
    );
    assert.equal(firstAccept.status, 200, await firstAccept.clone().text());
    assert.equal(
      (
        await request(
          `/requests/${localRequest.id}/accept`,
          "POST",
          {},
          otherDeveloper.cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          `/requests/${localRequest.id}/accept`,
          "POST",
          {},
          junior.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          `/requests/${localRequest.id}/release`,
          "POST",
          {},
          otherDeveloper.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          `/requests/${localRequest.id}/release`,
          "POST",
          {},
          junior.cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          `/requests/${localRequest.id}/accept`,
          "POST",
          {},
          otherDeveloper.cookie,
        )
      ).status,
      200,
    );
    const owned = await request(
      "/requests",
      "GET",
      undefined,
      requester.cookie,
    );
    const ownedBody = (await owned.json()) as {
      data: { claimedBy: string; claimantName: string }[];
    };
    assert.equal(ownedBody.data[0]?.claimedBy, otherDeveloper.id);
    assert.equal(ownedBody.data[0]?.claimantName, "Other Developer");
    assert.equal(
      (
        await request(
          `/requests/${localRequest.id}`,
          "PATCH",
          { status: "closed" },
          requester.cookie,
        )
      ).status,
      200,
    );

    const draftId = crypto.randomUUID();
    const draftContent = {
      ...emptyProjectDraft(),
      title: "Resumable project",
      description: "AI_UNAVAILABLE draft analysis failure",
      city: "Toronto",
      kind: "volunteer",
      minimumWeeklyHours: "4",
    };
    const draftResponse = await request(
      "/project-drafts",
      "POST",
      { id: draftId, content: draftContent },
      company.cookie,
    );
    assert.equal(draftResponse.status, 201, await draftResponse.clone().text());
    let projectDraft = (await draftResponse.json()) as ProjectDraftRecord;
    assert.equal(
      (
        await request(
          `/project-drafts/${draftId}`,
          "GET",
          undefined,
          otherCompany.cookie,
        )
      ).status,
      404,
    );
    assert.equal(
      (await request("/project-drafts", "GET", undefined, junior.cookie))
        .status,
      403,
    );
    assert.equal(
      (
        await request(
          `/project-drafts/${draftId}/publish`,
          "POST",
          { expectedUpdatedAt: projectDraft.updatedAt },
          company.cookie,
        )
      ).status,
      503,
    );
    assert.deepEqual(
      await (
        await request(
          `/project-drafts/${draftId}`,
          "GET",
          undefined,
          company.cookie,
        )
      ).json(),
      projectDraft,
    );
    const editResponse = await request(
      `/project-drafts/${draftId}`,
      "PUT",
      {
        expectedUpdatedAt: projectDraft.updatedAt,
        content: {
          ...draftContent,
          description: "Build an accessible website for a community garden.",
        },
      },
      company.cookie,
    );
    assert.equal(editResponse.status, 200);
    projectDraft = (await editResponse.json()) as ProjectDraftRecord;
    const publication = await request(
      `/project-drafts/${draftId}/publish`,
      "POST",
      { expectedUpdatedAt: projectDraft.updatedAt },
      company.cookie,
    );
    assert.equal(publication.status, 201, await publication.clone().text());
    const published = (await publication.json()) as { id: string };
    const duplicate = await request(
      `/project-drafts/${draftId}/publish`,
      "POST",
      { expectedUpdatedAt: projectDraft.updatedAt },
      company.cookie,
    );
    assert.equal(duplicate.status, 200);
    assert.equal(((await duplicate.json()) as { id: string }).id, published.id);

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
