import assert from "node:assert/strict";
import test from "node:test";
import {
  developerSchema,
  developerPreferencesSchema,
} from "../backend/schemas.ts";
import { hiringEligibility } from "../backend/hiring/eligibility.ts";
import { emptyHiringBrief } from "../backend/hiring/schemas.ts";
import { developer } from "./fixtures/matching.ts";

const preferences = {
  professionalExperienceYears: 0,
  compensationPreference: {
    currency: "CAD",
    minimumHourlyRate: 20,
    preferredHourlyRate: 30,
  },
  workArrangementPreference: { preferred: "remote" as const, required: false },
};
const {
  id: _id,
  name: _name,
  embedding: _embedding,
  location: _location,
  recentExposure: _exposure,
  ...profile
} = developer;
const brief = {
  ...emptyHiringBrief(),
  title: "Community website",
  description: "Help people find community events",
  workArrangement: "remote" as const,
  compensation: {
    kind: "paid" as const,
    currency: "CAD",
    period: "hour" as const,
    minimum: 20,
    maximum: 25,
  },
};

test("profile preferences accept zero professional years and legacy profiles remain valid", () => {
  assert.equal(developerSchema.safeParse(profile).success, true);
  assert.deepEqual(developerSchema.parse({ ...profile, ...preferences }), {
    ...profile,
    ...preferences,
  });
  assert.deepEqual(
    developerPreferencesSchema.parse({
      professionalExperienceYears: null,
      compensationPreference: null,
      workArrangementPreference: null,
    }),
    {
      professionalExperienceYears: null,
      compensationPreference: null,
      workArrangementPreference: null,
    },
  );
});

test("profile preferences reject invalid years, rates, currencies and contradictory work preferences", () => {
  for (const professionalExperienceYears of [-1, Infinity, 81])
    assert.equal(
      developerPreferencesSchema.safeParse({
        ...preferences,
        professionalExperienceYears,
      }).success,
      false,
    );
  for (const compensationPreference of [
    {
      currency: "not-a-currency",
      minimumHourlyRate: 20,
      preferredHourlyRate: 30,
    },
    { currency: "CAD", minimumHourlyRate: -1, preferredHourlyRate: 30 },
    { currency: "CAD", minimumHourlyRate: 30, preferredHourlyRate: 20 },
  ])
    assert.equal(
      developerPreferencesSchema.safeParse({
        ...preferences,
        compensationPreference,
      }).success,
      false,
    );
  assert.equal(
    developerPreferencesSchema.safeParse({
      ...preferences,
      workArrangementPreference: { preferred: "flexible", required: true },
    }).success,
    false,
  );
});

test("zero years and soft preferences do not prevent an opportunity", () => {
  assert.deepEqual(
    hiringEligibility(brief, { ...developer, ...preferences }),
    [],
  );
  assert.deepEqual(
    hiringEligibility(
      { ...brief, workArrangement: "onsite" },
      { ...developer, ...preferences },
    ),
    [],
  );
  assert.deepEqual(
    hiringEligibility(brief, {
      ...developer,
      ...preferences,
      professionalExperienceYears: 3,
    }),
    [],
  );
});

test("only confirmed comparable pay and work-arrangement boundaries exclude candidates", () => {
  const strict = {
    ...developer,
    ...preferences,
    workArrangementPreference: { preferred: "remote" as const, required: true },
  };
  assert.match(
    hiringEligibility({ ...brief, workArrangement: "onsite" }, strict).join(),
    /arrangement/,
  );
  assert.deepEqual(
    hiringEligibility({ ...brief, workArrangement: null }, strict),
    [],
  );
  assert.deepEqual(
    hiringEligibility({ ...brief, workArrangement: "flexible" }, strict),
    [],
  );
  assert.match(
    hiringEligibility(
      { ...brief, compensation: { ...brief.compensation, maximum: 19 } },
      strict,
    ).join(),
    /minimum/,
  );
  assert.deepEqual(
    hiringEligibility(
      {
        ...brief,
        compensation: { ...brief.compensation, currency: "USD", maximum: 19 },
      },
      strict,
    ),
    [],
  );
  assert.deepEqual(
    hiringEligibility(
      {
        ...brief,
        compensation: { ...brief.compensation, period: "project", maximum: 19 },
      },
      strict,
    ),
    [],
  );
  assert.deepEqual(
    hiringEligibility(
      { ...brief, compensation: { ...brief.compensation, maximum: null } },
      strict,
    ),
    [],
  );
  assert.deepEqual(
    hiringEligibility(brief, {
      ...developer,
      compensationPreference: null,
      workArrangementPreference: null,
    }),
    [],
  );
});
