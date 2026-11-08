import assert from "node:assert/strict";
import test from "node:test";
import { safeNext, afterAuthentication } from "../lib/navigation.ts";
import {
  emptyProfileDraft,
  onboardingProfile,
  onboardingStepErrors,
  toggleOnboardingSkill,
} from "../lib/onboarding.ts";
import { developerSchema } from "../backend/schemas.ts";

test("account-first homepage cannot become a sign-in return loop", () => {
  assert.equal(safeNext("/"), null);
  assert.equal(safeNext("/?next=/career"), null);
  assert.equal(afterAuthentication("developer", "/"), "/onboarding");
  assert.equal(
    safeNext("/map?focus=project#details"),
    "/map?focus=project#details",
  );
});

test("developer sign-in goes through the profile gate without losing the intended project", () => {
  const next = "/requests/one?from=map#scope";
  assert.equal(
    afterAuthentication("developer", next),
    "/onboarding?next=%2Frequests%2Fone%3Ffrom%3Dmap%23scope",
  );
  assert.equal(afterAuthentication("developer", null), "/onboarding");
  assert.equal(afterAuthentication("requester", null), "/dashboard");
});

test("skill shortcuts use the same canonical names as profile validation", () => {
  assert.equal(toggleOnboardingSkill("JS, Python", "JavaScript"), "python");
  assert.equal(toggleOnboardingSkill("React.js", "CSS"), "react, css");
});

test("guided steps validate independently and never infer experience or consent", () => {
  assert.equal(emptyProfileDraft.acceptsVolunteer, false);
  assert.equal(emptyProfileDraft.discoverable, false);
  const draft = { ...emptyProfileDraft, skills: "React, HTML" };
  assert.deepEqual(onboardingStepErrors(draft, 0), {});
  assert.ok(onboardingStepErrors(draft, 1).bio);
  assert.ok(onboardingStepErrors(draft, 1).experienceLevel);
  assert.ok(onboardingStepErrors(draft, 2).city);
  assert.equal(
    developerSchema.safeParse(onboardingProfile(draft)).success,
    false,
  );
  const complete = {
    ...draft,
    bio: "I enjoy making accessible community tools.",
    experienceLevel: "2",
    city: "Calgary",
    weeklyHours: "5",
  };
  for (let step = 0; step < 4; step++)
    assert.deepEqual(onboardingStepErrors(complete, step), {});
  const profile = developerSchema.parse(onboardingProfile(complete));
  assert.deepEqual(profile.skills, [
    { name: "react", level: 2 },
    { name: "html", level: 2 },
  ]);
  assert.deepEqual(profile.projects, []);
  assert.equal(profile.discoverable, false);
  assert.equal(profile.acceptsVolunteer, false);
  assert.ok(
    onboardingStepErrors({ ...complete, weeklyHours: "1.5" }, 2).weeklyHours,
  );
});
