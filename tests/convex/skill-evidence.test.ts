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

const contribution = {
  skills: ["React.js", "accessibility"],
  contribution:
    "Built the pantry directory and keyboard-accessible search interface.",
};
const requestDetails = {
  title: "Pantry directory",
  description:
    "Help the community find nearby pantry locations with a searchable directory.",
  place: "Calgary",
  latitude: 51.05,
  longitude: -114.08,
};

test("intentional community acceptance needs no pin and confirmation is owner-only and skill-specific", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const stranger = await actor(t, "requester");
  const developer = await actor(t, "developer");
  const otherDeveloper = await actor(t, "developer");
  await developer.client.mutation(api.data.putDeveloper, {
    profile: { ...profile, acceptsVolunteer: false, available: false },
    embedding,
  });
  await owner.client.mutation(api.data.createRequest, {
    id: "pantry",
    details: requestDetails,
    analysis,
    embedding,
  });
  const fit = await developer.client.query(api.data.ownRequestMatch, {
    id: "pantry",
  });
  expect(fit.ineligibleReasons).toEqual([]);
  expect(fit.considerations?.length).toBeGreaterThan(0);
  await expect(
    otherDeveloper.client.mutation(api.data.submitSkillEvidence, {
      source: "request",
      projectId: "pantry",
      ...contribution,
    }),
  ).rejects.toThrow();
  await developer.client.mutation(api.data.acceptRequest, { id: "pantry" });
  // Closing a request retains the participant, but does not manufacture a completion or skill award.
  await owner.client.mutation(api.data.closeRequest, { id: "pantry" });
  const submitted = await developer.client.mutation(
    api.data.submitSkillEvidence,
    { source: "request", projectId: "pantry", ...contribution },
  );
  expect(
    (await developer.client.query(api.data.ownProfile, {})).skillEvidence,
  ).toEqual([]);
  await expect(
    stranger.client.mutation(api.data.confirmSkillEvidence, {
      id: submitted.id,
      skills: ["react"],
    }),
  ).rejects.toThrow();
  await expect(
    owner.client.mutation(api.data.confirmSkillEvidence, {
      id: submitted.id,
      skills: ["rust"],
    }),
  ).rejects.toThrow(/submitted/);
  await owner.client.mutation(api.data.confirmSkillEvidence, {
    id: submitted.id,
    skills: ["react"],
  });
  await owner.client.mutation(api.data.confirmSkillEvidence, {
    id: submitted.id,
    skills: ["React.js"],
  });
  const own = await developer.client.query(api.data.ownProfile, {});
  expect(own.skillEvidence).toHaveLength(1);
  expect(own.skillEvidence?.[0].name).toBe("react");
  expect(own.skillEvidence?.[0].projects).toHaveLength(1);
  const visible = await owner.client.query(api.data.getDeveloper, {
    id: developer.id,
  });
  expect(visible.skillEvidence).toEqual(own.skillEvidence);
  expect(
    (
      await otherDeveloper.client.query(api.data.projectSkillEvidence, {
        source: "request",
        projectId: "pantry",
      })
    ).data,
  ).toEqual([]);
  await expect(
    developer.client.mutation(api.data.submitSkillEvidence, {
      source: "request",
      projectId: "pantry",
      ...contribution,
      contribution:
        "Different work should not give this project a second boost.",
    }),
  ).rejects.toThrow(/already/);
});

test("opportunity work needs mutual interest and mismatched skills or hours do not block a connection", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const developer = await actor(t, "developer");
  await developer.client.mutation(api.data.putDeveloper, {
    profile: { ...profile, weeklyHours: 1, city: "Calgary" },
    embedding,
  });
  await owner.client.mutation(api.data.createOpportunity, {
    id: "stretch",
    details: { ...job, essentialTechnologies: ["rust"] },
    analysis,
    embedding,
  });
  expect(
    (await owner.client.query(api.data.matches, { id: "stretch", limit: 20 }))
      .data,
  ).toHaveLength(1);
  await expect(
    developer.client.mutation(api.data.submitSkillEvidence, {
      source: "opportunity",
      projectId: "stretch",
      ...contribution,
    }),
  ).rejects.toThrow(/mutual/);
  await developer.client.mutation(api.data.setInterest, {
    id: "stretch",
    interested: true,
  });
  await developer.client.mutation(api.data.patchDeveloper, {
    available: false,
  });
  expect(
    (await owner.client.query(api.data.matches, { id: "stretch", limit: 20 }))
      .data,
  ).toHaveLength(1);
  await owner.client.mutation(api.data.setInterest, {
    id: "stretch",
    developerId: developer.id,
    interested: true,
  });
  const first = await developer.client.mutation(api.data.submitSkillEvidence, {
    source: "opportunity",
    projectId: "stretch",
    ...contribution,
  });
  const retry = await developer.client.mutation(api.data.submitSkillEvidence, {
    source: "opportunity",
    projectId: "stretch",
    ...contribution,
  });
  expect(retry.id).toBe(first.id);
  await owner.client.mutation(api.data.confirmSkillEvidence, {
    id: first.id,
    skills: ["accessibility"],
  });
  expect(
    (await developer.client.query(api.data.ownProfile, {})).skillEvidence?.[0]
      .name,
  ).toBe("accessibility");
});
