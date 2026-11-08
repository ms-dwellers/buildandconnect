import { z } from "zod";
import {
  developerSchema,
  normalizeSkill,
  type DeveloperProfile,
} from "./schemas.ts";

const name = z.string().trim().min(1).max(100).transform(normalizeSkill);
const level = z.number().int().min(1).max(5);
export const skillChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), name, level }).strict(),
  z
    .object({
      action: z.literal("set-level"),
      name,
      level,
      expectedLevel: level,
    })
    .strict(),
  z
    .object({ action: z.literal("remove"), name, expectedLevel: level })
    .strict(),
]);
export type SkillChange = z.infer<typeof skillChangeSchema>;

export function applySkillChange(
  skills: DeveloperProfile["skills"],
  change: SkillChange,
):
  | { ok: true; skills: DeveloperProfile["skills"] }
  | { ok: false; status: 400 | 409; error: string } {
  const current = skills.find(
    (skill) => normalizeSkill(skill.name) === change.name,
  );
  if (change.action === "add") {
    if (current)
      return {
        ok: false,
        status: 409,
        error: "That skill is already on your profile. Edit its level instead.",
      };
    if (skills.length >= 30)
      return {
        ok: false,
        status: 400,
        error:
          "You can list up to 30 skills. Remove one before adding another.",
      };
    return {
      ok: true,
      skills: developerSchema.shape.skills.parse([
        ...skills,
        { name: change.name, level: change.level },
      ]),
    };
  }
  if (
    !current ||
    (current.level !== change.expectedLevel &&
      !(change.action === "set-level" && current.level === change.level))
  ) {
    return {
      ok: false,
      status: 409,
      error:
        "This skill changed in another tab. Refresh your skills before trying again.",
    };
  }
  if (change.action === "remove" && skills.length === 1)
    return {
      ok: false,
      status: 400,
      error: "Keep at least one skill on your profile.",
    };
  return {
    ok: true,
    skills: skills.flatMap((skill) =>
      normalizeSkill(skill.name) !== change.name
        ? [skill]
        : change.action === "remove"
          ? []
          : [{ ...skill, level: change.level }],
    ),
  };
}
