import {
  developerSchema,
  normalizeSkill,
  skillTagsSchema,
} from "../backend/schemas.ts";

export const PROFILE_STEPS = [
  "Skills",
  "About you",
  "Availability",
  "Preferences",
] as const;
export type ProfileDraft = {
  skills: string;
  bio: string;
  experienceLevel: string;
  city: string;
  weeklyHours: string;
  wantsToLearn: string;
  interests: string;
  acceptsVolunteer: boolean;
  discoverable: boolean;
};

export const emptyProfileDraft: ProfileDraft = {
  skills: "",
  bio: "",
  experienceLevel: "",
  city: "",
  weeklyHours: "",
  wantsToLearn: "",
  interests: "",
  acceptsVolunteer: false,
  discoverable: false,
};

export function onboardingList(value: string) {
  return [...new Set(value.split(",").map(normalizeSkill).filter(Boolean))];
}

export function toggleOnboardingSkill(value: string, skill: string) {
  const selected = onboardingList(value);
  const normalized = normalizeSkill(skill);
  return (
    selected.includes(normalized)
      ? selected.filter((item) => item !== normalized)
      : [...selected, normalized]
  ).join(", ");
}

export function onboardingProfile(draft: ProfileDraft) {
  const level = Number(draft.experienceLevel);
  return {
    bio: draft.bio,
    city: draft.city,
    skills: onboardingList(draft.skills).map((name) => ({ name, level })),
    projects: [],
    interests: onboardingList(draft.interests),
    wantsToLearn: onboardingList(draft.wantsToLearn),
    experienceLevel: level,
    collaboration: "flexible" as const,
    weeklyHours: Number(draft.weeklyHours),
    acceptsVolunteer: draft.acceptsVolunteer,
    available: true,
    discoverable: draft.discoverable,
  };
}

export function onboardingStepErrors(draft: ProfileDraft, step: number) {
  const profile = onboardingProfile(draft);
  const result =
    step === 0
      ? skillTagsSchema
          .refine((values) => values.length > 0, "Choose at least one skill.")
          .safeParse(onboardingList(draft.skills))
      : step === 1
        ? developerSchema.pick({ bio: true, experienceLevel: true }).safeParse({
            bio: profile.bio,
            experienceLevel: profile.experienceLevel,
          })
        : step === 2
          ? developerSchema.pick({ city: true, weeklyHours: true }).safeParse({
              city: profile.city,
              weeklyHours: profile.weeklyHours,
            })
          : developerSchema
              .pick({ interests: true, wantsToLearn: true })
              .safeParse({
                interests: profile.interests,
                wantsToLearn: profile.wantsToLearn,
              });
  if (result.success) return {};
  const messages: Record<string, string> = {
    skills: onboardingList(draft.skills).length
      ? "Use up to 30 skills, with a short name for each."
      : "Choose at least one skill.",
    bio: "Write a short introduction, between 10 and 2,000 characters.",
    experienceLevel: "Choose your current experience level.",
    city: "Enter your city, using no more than 100 characters.",
    weeklyHours: "Choose a whole number of hours from 1 to 80.",
    interests: "Use up to 30 causes, separated by commas.",
    wantsToLearn: "Use up to 30 learning goals, separated by commas.",
  };
  return Object.fromEntries(
    result.error.issues.map((issue) => {
      const field = step === 0 ? "skills" : String(issue.path[0]);
      return [field, messages[field] ?? issue.message];
    }),
  );
}

export function onboardingFieldStep(field: string) {
  if (field === "skills") return 0;
  if (field === "bio" || field === "experienceLevel") return 1;
  if (field === "city" || field === "weeklyHours") return 2;
  return 3;
}
