import { expect, test } from "vitest";
import {
  actor,
  analysis,
  api,
  embedding,
  job,
  profile,
  setup,
} from "./harness";

test("individual skill edits preserve profile details, preferences, privacy and location", async () => {
  const t = setup();
  const developer = await actor(t, "developer");
  const requester = await actor(t, "requester");
  await developer.client.mutation(api.data.putDeveloper, {
    profile: { ...profile, discoverable: false },
    embedding,
  });
  const initial = await developer.client.query(api.data.ownProfile, {});
  await expect(
    requester.client.mutation(api.data.updateDeveloperSkills, {
      change: { action: "add", name: "typescript", level: 1 },
    }),
  ).rejects.toThrow();
  await developer.client.mutation(api.data.updateDeveloperSkills, {
    change: { action: "add", name: "TS", level: 1 },
  });
  const added = await developer.client.query(api.data.ownProfile, {});
  expect(added.skills).toContainEqual({ name: "typescript", level: 1 });
  expect(added.bio).toBe(initial.bio);
  expect(added.projects).toEqual(initial.projects);
  expect(added.location).toEqual(initial.location);
  expect(added.discoverable).toBe(false);
  expect(added.revision).toBeGreaterThan(initial.revision!);
  await developer.client.mutation(api.data.updateDeveloperSkills, {
    change: {
      action: "set-level",
      name: "typescript",
      level: 3,
      expectedLevel: 1,
    },
  });
  await expect(
    developer.client.mutation(api.data.updateDeveloperSkills, {
      change: { action: "remove", name: "typescript", expectedLevel: 1 },
    }),
  ).rejects.toThrow(/changed/);
  await developer.client.mutation(api.data.updateDeveloperSkills, {
    change: { action: "remove", name: "typescript", expectedLevel: 3 },
  });
  expect(
    (await developer.client.query(api.data.ownProfile, {})).skills,
  ).toEqual(initial.skills);
});

test("developers with skill gaps can share a contribution plan, and requesters cannot rewrite it", async () => {
  const t = setup();
  const developer = await actor(t, "developer");
  const requester = await actor(t, "requester");
  await developer.client.mutation(api.data.putDeveloper, {
    profile: {
      ...profile,
      skills: [{ name: "python", level: 1 }],
      projects: [],
    },
    embedding,
  });
  await requester.client.mutation(api.data.createOpportunity, {
    id: "learn",
    details: { ...job, essentialTechnologies: ["rust", "go"] },
    analysis: { ...analysis, requiredTechnologies: ["rust", "go"] },
    embedding,
  });
  expect(
    (await developer.client.query(api.data.ownMatch, { id: "learn" }))
      .canExpressInterest,
  ).toBe(true);
  const developerNote =
    "I can help with the data import, and would like support learning Rust.";
  await developer.client.mutation(api.data.setInterest, {
    id: "learn",
    interested: true,
    developerNote,
  });
  await expect(
    requester.client.mutation(api.data.setInterest, {
      id: "learn",
      developerId: developer.id,
      interested: true,
      developerNote: "Changed by someone else",
    }),
  ).rejects.toThrow(/Only the developer/);
  await requester.client.mutation(api.data.setInterest, {
    id: "learn",
    developerId: developer.id,
    interested: true,
  });
  const response = await requester.client.query(api.data.connections, {
    after: "",
    limit: 20,
    connectedOnly: false,
    opportunityId: "learn",
  });
  expect(response.data[0].developerNote).toBe(developerNote);
  expect(response.data[0].connected).toBe(true);
  await developer.client.mutation(api.data.setInterest, {
    id: "learn",
    interested: false,
  });
  expect(
    (
      await requester.client.query(api.data.connections, {
        after: "",
        limit: 20,
        connectedOnly: false,
        opportunityId: "learn",
      })
    ).data[0].developerNote,
  ).toBe(developerNote);
});
