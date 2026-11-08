import assert from "node:assert/strict";
import test from "node:test";
import {
  applySkillChange,
  skillChangeSchema,
} from "../backend/profile-skills.ts";

test("skills can be added individually with aliases normalized and duplicates rejected", () => {
  const result = applySkillChange(
    [{ name: "react", level: 1 }],
    skillChangeSchema.parse({ action: "add", name: " TS ", level: 2 }),
  );
  assert.deepEqual(result, {
    ok: true,
    skills: [
      { name: "react", level: 1 },
      { name: "typescript", level: 2 },
    ],
  });
  assert.equal(
    applySkillChange(
      [{ name: "react", level: 1 }],
      skillChangeSchema.parse({ action: "add", name: "React.js", level: 3 }),
    ).ok,
    false,
  );
});

test("skill-level edits detect stale values and preserve unrelated skills", () => {
  const skills = [
    { name: "react", level: 2 },
    { name: "typescript", level: 1 },
  ];
  assert.deepEqual(
    applySkillChange(skills, {
      action: "set-level",
      name: "react",
      level: 4,
      expectedLevel: 2,
    }),
    { ok: true, skills: [{ name: "react", level: 4 }, skills[1]] },
  );
  const stale = applySkillChange(skills, {
    action: "set-level",
    name: "react",
    level: 4,
    expectedLevel: 1,
  });
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.status, 409);
  assert.deepEqual(
    applySkillChange(skills, {
      action: "set-level",
      name: "react",
      level: 2,
      expectedLevel: 1,
    }),
    { ok: true, skills },
  );
});

test("removal keeps a minimum of one skill and the skill limit remains enforced", () => {
  assert.equal(
    applySkillChange([{ name: "react", level: 1 }], {
      action: "remove",
      name: "react",
      expectedLevel: 1,
    }).ok,
    false,
  );
  const skills = Array.from({ length: 30 }, (_, index) => ({
    name: `skill-${index}`,
    level: 1,
  }));
  assert.equal(
    applySkillChange(skills, { action: "add", name: "typescript", level: 1 })
      .ok,
    false,
  );
  assert.equal(
    skillChangeSchema.safeParse({
      action: "add",
      name: "typescript",
      level: 0,
      skillEvidence: [],
    }).success,
    false,
  );
});
