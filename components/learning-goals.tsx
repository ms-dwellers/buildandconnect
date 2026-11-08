"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/forms/form-kit";
import { onboardingList, toggleOnboardingSkill } from "@/lib/onboarding";

const paths = [
  {
    title: "Web & interfaces",
    skills: ["React", "TypeScript", "Accessibility", "UI design"],
  },
  {
    title: "Backend & shipping",
    skills: ["Node.js", "Python", "SQL", "APIs", "Testing", "Docker"],
  },
  {
    title: "Explore something new",
    skills: ["Machine learning", "Data visualization", "Swift", "React Native"],
  },
];

export function LearningGoals({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = onboardingList(value);
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold">What would you like to learn?</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Pick a few directions, or add your own. These help us find projects
          you can grow into, not skills you need already.
        </p>
      </div>
      {paths.map((path) => (
        <fieldset key={path.title} className="space-y-2">
          <legend className="mb-2 text-sm text-muted-foreground">
            {path.title}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {path.skills.map((skill) => {
              const active = selected.includes(skill.toLowerCase());
              return (
                <Button
                  key={skill}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={active}
                  onClick={() => onChange(toggleOnboardingSkill(value, skill))}
                  className="h-auto min-h-10 justify-between whitespace-normal py-2 text-start aria-pressed:border-primary aria-pressed:bg-secondary"
                >
                  {skill}
                  {active && (
                    <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
                  )}
                </Button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <TextField
        name="wantsToLearn"
        label="Your learning goals (optional)"
        description="You can edit this list or add other goals, separated by commas."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={3000}
        placeholder="For example: React, testing, public speaking"
      />
    </div>
  );
}
