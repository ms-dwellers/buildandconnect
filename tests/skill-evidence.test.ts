import assert from "node:assert/strict";
import test from "node:test";
import {
  skillEvidenceSubmissionSchema,
  summarizeSkillEvidence,
} from "../backend/skill-evidence.ts";

test("only confirmed, distinct projects count as backing for the confirmed skills", () => {
  const row = {
    source: "request" as const,
    projectId: "garden",
    projectTitle: "Garden site",
    requesterName: "Neighbour",
    confirmedSkills: ["React.js", "react"],
    confirmedAt: 1,
  };
  const summary = summarizeSkillEvidence([
    row,
    row,
    { ...row, projectId: "pending", confirmedAt: null },
    { ...row, projectId: "other", confirmedSkills: ["typescript"] },
  ]);
  assert.deepEqual(
    summary.map((skill) => [skill.name, skill.projects.length]),
    [
      ["react", 1],
      ["typescript", 1],
    ],
  );
});

test("contributions normalize skill aliases and cannot submit their own trusted backing", () => {
  const input = {
    skills: ["React.js", "react"],
    contribution:
      "I built the pantry search interface and keyboard navigation.",
  };
  assert.deepEqual(skillEvidenceSubmissionSchema.parse(input).skills, [
    "react",
  ]);
  assert.equal(
    skillEvidenceSubmissionSchema.safeParse({ ...input, confirmedAt: 1 })
      .success,
    false,
  );
  assert.equal(
    skillEvidenceSubmissionSchema.safeParse({ ...input, skills: [] }).success,
    false,
  );
});
