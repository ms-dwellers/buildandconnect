import assert from "node:assert/strict";
import test from "node:test";
import {
  activitiesForRequirement,
  careerMapListings,
  projectsForRequirement,
  type CareerProject,
} from "../lib/career.ts";
import type { CityJob } from "../lib/calgary-area.ts";

const project = {
  id: "same-id",
  source: "request",
  activities: [
    { id: "login", description: "Add staff login", skills: ["authentication"] },
    { id: "forms", description: "Create volunteer forms", skills: ["react"] },
  ],
  requirementLinks: [
    {
      requirementId: "auth",
      skills: ["authentication"],
      gapSkillsWithPractice: ["authentication"],
      activityLinks: [{ activityId: "login", skills: ["authentication"] }],
    },
    {
      requirementId: "react",
      skills: ["react"],
      gapSkillsWithPractice: [],
      activityLinks: [{ activityId: "forms", skills: ["react"] }],
    },
  ],
} as CareerProject;

test("requirement selection shows only related projects and concrete linked activities", () => {
  assert.deepEqual(projectsForRequirement([project], "auth"), [project]);
  assert.deepEqual(projectsForRequirement([project], "degree"), []);
  assert.deepEqual(
    activitiesForRequirement(project, "auth").map((item) => item.id),
    ["login"],
  );
  assert.deepEqual(
    activitiesForRequirement(project, null).map((item) => item.id),
    ["login", "forms"],
  );
  assert.deepEqual(
    activitiesForRequirement({ ...project, activities: [] }, "auth"),
    [],
  );
});

test("career map reuses visible listing coordinates and source-qualified IDs", () => {
  const listing = {
    id: "same-id",
    source: "request",
    latitude: 51.04,
    longitude: -114.07,
    precise: false,
  } as CityJob;
  const other = { ...listing, source: "opportunity" } as CityJob;
  assert.deepEqual(careerMapListings([project], [listing, other]), [listing]);
  assert.deepEqual(careerMapListings([project], []), []);
  assert.deepEqual(careerMapListings([], [listing]), []);
  assert.equal(careerMapListings([project], [listing])[0].precise, false);
});
