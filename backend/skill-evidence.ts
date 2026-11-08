import { z } from "zod";
import { normalizeSkill, skillTagsSchema } from "./schemas.ts";

export const practicedSkillsSchema = skillTagsSchema.refine(
  (skills) => skills.length > 0,
  "Choose at least one skill you used",
);
export const skillEvidenceSubmissionSchema = z
  .object({
    skills: practicedSkillsSchema,
    contribution: z.string().trim().min(20).max(1500),
  })
  .strict();

export type SkillBacking = {
  name: string;
  projects: {
    source: "opportunity" | "request";
    projectId: string;
    title: string;
    requesterName: string;
    contribution?: string;
    confirmedAt: number;
  }[];
};

export function summarizeSkillEvidence(
  rows: {
    source: "opportunity" | "request";
    projectId: string;
    projectTitle: string;
    requesterName: string;
    confirmedSkills: string[];
    confirmedAt: number | null;
    contribution?: string;
  }[],
): SkillBacking[] {
  const skills = new Map<string, SkillBacking>();
  for (const row of rows) {
    if (row.confirmedAt === null) continue;
    for (const name of new Set(row.confirmedSkills.map(normalizeSkill))) {
      const backing = skills.get(name) ?? { name, projects: [] };
      if (
        !backing.projects.some(
          (project) =>
            project.source === row.source &&
            project.projectId === row.projectId,
        )
      ) {
        backing.projects.push({
          source: row.source,
          projectId: row.projectId,
          title: row.projectTitle,
          requesterName: row.requesterName,
          contribution: row.contribution,
          confirmedAt: row.confirmedAt,
        });
      }
      skills.set(name, backing);
    }
  }
  return [...skills.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Evidence strengthens readiness without converting a self-rating into a verified level.
// Diminishing returns keep experienced developers from overwhelming newcomers.
export function skillEvidenceBoost(projectCount: number): number {
  return Math.min(1, Math.log2(1 + Math.max(0, projectCount)) / 3);
}
