import { eligibility, scoreMatch } from "../matching.ts";
import {
  normalizeSkill,
  type Developer,
  type Opportunity,
} from "../schemas.ts";
import type { CareerTarget } from "./schemas.ts";

export const CAREER_MATCH_VERSION = "career-v1";

function reportedSkills(developer: Developer) {
  return new Set([
    ...developer.skills.map((skill) => normalizeSkill(skill.name)),
    ...developer.projects.flatMap((project) =>
      project.technologies.map(normalizeSkill),
    ),
  ]);
}

export function careerSkillGaps(target: CareerTarget, developer: Developer) {
  const reported = reportedSkills(developer);
  return target.requirements.map((requirement) => {
    const selfReportedSkills = requirement.skills.filter((skill) =>
      reported.has(skill),
    );
    const missingSkills = requirement.skills.filter(
      (skill) => !reported.has(skill),
    );
    return {
      ...requirement,
      selfReportedSkills,
      missingSkills,
      evidenceStatus:
        requirement.skills.length > 0 && missingSkills.length === 0
          ? ("self_reported" as const)
          : ("needs_evidence" as const),
    };
  });
}

export function scoreCareerProject(
  target: CareerTarget,
  developer: Developer,
  project: Opportunity,
) {
  // Personal exploration is private. Existing claim/interest consent gates stay unchanged.
  const match = scoreMatch(project, { ...developer, discoverable: true });
  if (!match) return null;
  const activities = project.analysis.activities ?? [];
  const offeredSkills = new Set([
    ...project.analysis.requiredTechnologies,
    ...project.analysis.preferredTechnologies,
    ...project.analysis.requiredSkills,
    ...project.analysis.learningOpportunities,
    ...activities.flatMap((activity) => activity.skills),
  ]);
  const requirementLinks = careerSkillGaps(target, developer).flatMap(
    (requirement) => {
      const skills = requirement.skills.filter((skill) =>
        offeredSkills.has(skill),
      );
      if (!skills.length) return [];
      return [
        {
          requirementId: requirement.id,
          skills,
          gapSkillsWithPractice: requirement.missingSkills.filter((skill) =>
            offeredSkills.has(skill),
          ),
          activityLinks: activities.flatMap((activity) => {
            const practicedSkills = activity.skills.filter((skill) =>
              skills.includes(skill),
            );
            return practicedSkills.length
              ? [{ activityId: activity.id, skills: practicedSkills }]
              : [];
          }),
        },
      ];
    },
  );
  if (!requirementLinks.length) return null;
  const linked = new Set(requirementLinks.map((link) => link.requirementId));
  return {
    score: match.score,
    scores: match.scores,
    existingRelevantSkills: match.existingRelevantSkills,
    skillsToDevelop: match.skillsToDevelop,
    explanation: match.explanation,
    actionIneligibleReasons: eligibility(project, developer),
    careerRelevance: {
      requirementsWithPractice: requirementLinks.length,
      gapRequirementsWithPractice: requirementLinks.filter(
        (link) => link.gapSkillsWithPractice.length > 0,
      ).length,
      totalRequirements: target.requirements.length,
    },
    requirementLinks,
    unaddressedRequirementIds: target.requirements
      .filter((requirement) => !linked.has(requirement.id))
      .map((requirement) => requirement.id),
  };
}
