import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  actor,
  analysis,
  api,
  components,
  embedding,
  job,
  profile,
  secret,
  setup,
} from "./harness";

beforeEach(() => vi.stubEnv("CONVEX_BRIDGE_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());

test("legacy customer accounts become requesters without losing ownership or data", async () => {
  for (const legacyRole of ["company", "recruiter"] as const) {
    const t = setup();
    const customer = await actor(t, "requester");
    const posted = await customer.client.mutation(api.data.createOpportunity, {
      secret,
      id: crypto.randomUUID(),
      details: job,
      analysis,
      embedding,
    });
    await t.run(async (ctx) => {
      const member = await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", customer.id))
        .unique();
      await ctx.db.patch(member!._id, { role: legacyRole });
    });
    expect(await customer.client.query(api.data.me, { secret })).toMatchObject({
      role: "requester",
      user: { id: customer.id },
    });
    const owned = await customer.client.query(api.data.ownedOpportunities, {
      secret,
      after: "",
      limit: 20,
    });
    expect(owned.data[0].id).toBe(posted.id);
    await expect(
      customer.client.mutation(api.data.setRole, { secret, role: "requester" }),
    ).resolves.toEqual({ role: "requester" });
    await expect(
      customer.client.mutation(api.data.setRole, {
        secret,
        role: legacyRole as never,
      }),
    ).rejects.toThrow();
  }
});

test("data access requires both the server bridge and a live authenticated session", async () => {
  const t = setup();
  await expect(t.query(api.data.me, { secret: "wrong" })).rejects.toThrow(
    /application API/,
  );
  await expect(t.query(api.data.me, { secret })).rejects.toThrow(/Sign in/);
  const dev = await actor(t, "developer");
  await expect(
    dev.client.query(api.data.me, { secret }),
  ).resolves.toMatchObject({ user: { id: dev.id }, role: "developer" });
  await expect(
    dev.client.mutation(api.data.setRole, { secret, role: "requester" }),
  ).rejects.toThrow(/already set/);
  await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "session",
        where: [{ field: "_id", value: dev.sessionId }],
      },
    }),
  );
  await expect(dev.client.query(api.data.me, { secret })).rejects.toThrow(
    /Sign in/,
  );
});

test("profile privacy, location, and availability remain independent of AI", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const company = await actor(t, "requester");
  const recruiter = await actor(t, "requester");
  await dev.client.mutation(api.data.putDeveloper, {
    secret,
    profile,
    embedding,
  });
  await dev.client.mutation(api.data.setLocation, {
    secret,
    location: { latitude: 43.65, longitude: -79.38, radiusKm: 25 },
  });
  const own = await dev.client.query(api.data.ownProfile, { secret });
  expect(own.location?.radiusKm).toBe(25);
  expect(own).not.toHaveProperty("embedding");
  const browse = await company.client.query(api.data.developers, {
    secret,
    after: "",
    limit: 20,
  });
  expect(browse.data[0]).not.toHaveProperty("location");
  expect(browse.data[0]).not.toHaveProperty("embedding");
  await dev.client.mutation(api.data.patchDeveloper, {
    secret,
    discoverable: false,
    available: false,
  });
  expect(
    (
      await recruiter.client.query(api.data.developers, {
        secret,
        after: "",
        limit: 20,
      })
    ).data,
  ).toHaveLength(0);
  await expect(
    company.client.mutation(api.data.setLocation, {
      secret,
      location: { latitude: 0, longitude: 0, radiusKm: 25 },
    }),
  ).rejects.toThrow(/role/);
});

test("matching preferences persist for zero-experience developers without regenerating embeddings", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const other = await actor(t, "developer");
  const company = await actor(t, "requester");
  await dev.client.mutation(api.data.putDeveloper, {
    secret,
    profile,
    embedding,
  });
  const preferences = {
    professionalExperienceYears: 0,
    compensationPreference: {
      currency: "CAD",
      minimumHourlyRate: 20,
      preferredHourlyRate: 30,
    },
    workArrangementPreference: {
      preferred: "remote" as const,
      required: false,
    },
  };
  await dev.client.mutation(api.data.updateDeveloperPreferences, {
    secret,
    preferences,
  });
  expect(await dev.client.query(api.data.ownProfile, { secret })).toMatchObject(
    preferences,
  );
  const browse = await company.client.query(api.data.developers, {
    secret,
    after: "",
    limit: 20,
  });
  expect(browse.data[0]).toMatchObject(preferences);
  expect(browse.data[0]).not.toHaveProperty("embedding");
  expect(browse.data[0]).not.toHaveProperty("location");
  const stored = await t.run((ctx) => ctx.db.query("developers").collect());
  expect(stored[0].embedding).toEqual(embedding);
  expect(stored[0].profile.bio).toBe(profile.bio);
  await expect(
    company.client.mutation(api.data.updateDeveloperPreferences, {
      secret,
      preferences,
    }),
  ).rejects.toThrow(/role/);
  await expect(
    other.client.mutation(api.data.updateDeveloperPreferences, {
      secret,
      preferences,
    }),
  ).rejects.toThrow(/profile first/);
  await expect(
    dev.client.mutation(api.data.updateDeveloperPreferences, {
      secret: "wrong",
      preferences,
    }),
  ).rejects.toThrow(/application API/);

  // Older clients omit the optional fields when replacing the core profile.
  await dev.client.mutation(api.data.putDeveloper, {
    secret,
    profile: { ...profile, bio: "Updated community websites profile." },
    embedding,
  });
  expect(await dev.client.query(api.data.ownProfile, { secret })).toMatchObject(
    preferences,
  );
  await dev.client.mutation(api.data.patchDeveloper, {
    secret,
    available: false,
  });
  expect(await dev.client.query(api.data.ownProfile, { secret })).toMatchObject(
    preferences,
  );
  await dev.client.mutation(api.data.updateDeveloperPreferences, {
    secret,
    preferences: {
      professionalExperienceYears: null,
      compensationPreference: null,
      workArrangementPreference: null,
    },
  });
  expect(await dev.client.query(api.data.ownProfile, { secret })).toMatchObject(
    {
      professionalExperienceYears: null,
      compensationPreference: null,
      workArrangementPreference: null,
    },
  );
});

test("invalid developer preferences do not change stored profiles", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  await dev.client.mutation(api.data.putDeveloper, {
    secret,
    profile,
    embedding,
  });
  await expect(
    dev.client.mutation(api.data.updateDeveloperPreferences, {
      secret,
      preferences: {
        professionalExperienceYears: -1,
        compensationPreference: null,
        workArrangementPreference: null,
      },
    }),
  ).rejects.toThrow();
  expect(
    (await dev.client.query(api.data.ownProfile, { secret }))
      .professionalExperienceYears,
  ).toBeUndefined();
});

test("opportunity ownership, matching, and mutual interest are enforced atomically", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const company = await actor(t, "requester");
  const other = await actor(t, "requester");
  await dev.client.mutation(api.data.putDeveloper, {
    secret,
    profile,
    embedding,
  });
  const posted = await company.client.mutation(api.data.createOpportunity, {
    secret,
    id: crypto.randomUUID(),
    details: job,
    analysis,
    embedding,
  });
  await expect(
    other.client.query(api.data.matches, { secret, id: posted.id, limit: 20 }),
  ).rejects.toThrow(/owner/);
  const ranked = await company.client.query(api.data.matches, {
    secret,
    id: posted.id,
    limit: 20,
  });
  expect(ranked.total).toBe(1);
  await dev.client.mutation(api.data.setInterest, {
    secret,
    id: posted.id,
    interested: true,
  });
  expect(
    (
      await dev.client.query(api.data.connections, {
        secret,
        after: "",
        limit: 20,
        connectedOnly: true,
      })
    ).data,
  ).toHaveLength(0);
  await company.client.mutation(api.data.setInterest, {
    secret,
    id: posted.id,
    developerId: dev.id,
    interested: true,
  });
  expect(
    (
      await dev.client.query(api.data.connections, {
        secret,
        after: "",
        limit: 20,
        connectedOnly: true,
      })
    ).data,
  ).toHaveLength(1);
  await dev.client.mutation(api.data.setInterest, {
    secret,
    id: posted.id,
    interested: false,
  });
  expect(
    (
      await company.client.query(api.data.connections, {
        secret,
        after: "",
        limit: 20,
        connectedOnly: true,
      })
    ).data,
  ).toHaveLength(0);
  const retained = await t.run((ctx) => ctx.db.query("interests").collect());
  expect(retained).toHaveLength(1);
  expect(retained[0].firstCompanyInterestAt).not.toBeNull();
});

test("local requests preserve exclusive claims, retry safety, and owner-only closing", async () => {
  const t = setup();
  const requester = await actor(t, "requester");
  const otherRequester = await actor(t, "requester");
  const first = await actor(t, "developer");
  const second = await actor(t, "developer");
  for (const dev of [first, second]) {
    await dev.client.mutation(api.data.putDeveloper, {
      secret,
      profile,
      embedding,
    });
    await dev.client.mutation(api.data.setLocation, {
      secret,
      location: { latitude: 43.65, longitude: -79.38, radiusKm: 25 },
    });
  }
  const request = await requester.client.mutation(api.data.createRequest, {
    secret,
    id: crypto.randomUUID(),
    details: {
      title: "Garden website",
      description: job.description,
      place: "Toronto",
      latitude: 43.65,
      longitude: -79.38,
    },
    analysis,
    embedding,
  });
  expect(
    (await first.client.query(api.data.nearbyRequests, { secret, limit: 20 }))
      .total,
  ).toBe(1);
  const claims = await Promise.allSettled(
    [first, second].map((dev) =>
      dev.client.mutation(api.data.acceptRequest, { secret, id: request.id }),
    ),
  );
  expect(claims.filter((result) => result.status === "fulfilled")).toHaveLength(
    1,
  );
  const claimant = claims[0].status === "fulfilled" ? first : second;
  await expect(
    claimant.client.mutation(api.data.acceptRequest, {
      secret,
      id: request.id,
    }),
  ).resolves.toMatchObject({ claimedBy: claimant.id });
  await expect(
    otherRequester.client.mutation(api.data.closeRequest, {
      secret,
      id: request.id,
    }),
  ).rejects.toThrow(/requester/);
  await requester.client.mutation(api.data.releaseRequest, {
    secret,
    id: request.id,
  });
  expect(
    (await first.client.query(api.data.nearbyRequests, { secret, limit: 20 }))
      .total,
  ).toBe(1);
  await requester.client.mutation(api.data.closeRequest, {
    secret,
    id: request.id,
  });
  expect(
    (await first.client.query(api.data.nearbyRequests, { secret, limit: 20 }))
      .total,
  ).toBe(0);
});
