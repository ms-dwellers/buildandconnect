"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { TextAreaField, TextField } from "@/components/forms/form-kit";
import { LearningGoals } from "@/components/learning-goals";
import {
  onboardingList,
  toggleOnboardingSkill,
  type ProfileDraft,
} from "@/lib/onboarding";

type Props = {
  draft: ProfileDraft;
  update: <K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K],
  ) => void;
};
const skills = [
  "React",
  "JavaScript",
  "TypeScript",
  "Python",
  "HTML",
  "CSS",
  "UI design",
  "SQL",
];
const levels = [
  { value: "1", title: "Beginner", description: "I’m learning the basics." },
  {
    value: "2",
    title: "Comfortable",
    description: "I can build with some guidance.",
  },
  { value: "3", title: "Capable", description: "I can build independently." },
  {
    value: "4",
    title: "Strong",
    description: "I can help others with this work.",
  },
  {
    value: "5",
    title: "Expert",
    description: "I have deep experience with these skills.",
  },
];

export function SkillsStep({ draft, update }: Props) {
  const selected = onboardingList(draft.skills);
  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label="Quick skill choices"
        className="grid grid-cols-2 gap-3"
      >
        {skills.map((skill) => (
          <Button
            key={skill}
            variant="outline"
            className="h-auto min-h-12 justify-between whitespace-normal py-3 text-start aria-pressed:border-primary aria-pressed:bg-secondary"
            aria-pressed={selected.includes(skill.toLowerCase())}
            onClick={() =>
              update("skills", toggleOnboardingSkill(draft.skills, skill))
            }
          >
            {skill}
            {selected.includes(skill.toLowerCase()) && (
              <CheckIcon aria-hidden="true" />
            )}
          </Button>
        ))}
      </div>
      <TextField
        name="skills"
        label="Your skills"
        description="Add or edit skills, separated by commas."
        value={draft.skills}
        onChange={(event) => update("skills", event.target.value)}
        maxLength={3000}
      />
      <p className="text-sm text-muted-foreground">
        Personal, school and volunteer projects all count as practice.
      </p>
    </div>
  );
}

export function AboutStep({ draft, update }: Props) {
  return (
    <div className="space-y-5">
      <TextAreaField
        name="bio"
        label="What do you enjoy building?"
        value={draft.bio}
        onChange={(event) => update("bio", event.target.value)}
        minLength={10}
        maxLength={2000}
        rows={3}
        description="A short introduction, at least 10 characters."
      />
      <div className="space-y-3">
        <Label id="starting-level-label">
          Your current level with these skills
        </Label>
        <RadioGroup
          className="grid gap-3 sm:grid-cols-2"
          name="experienceLevel"
          aria-labelledby="starting-level-label"
          value={draft.experienceLevel}
          onValueChange={(value) => update("experienceLevel", String(value))}
        >
          {levels.map((level) => (
            <Label
              key={level.value}
              htmlFor={`level-${level.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 font-sans has-data-checked:border-primary has-data-checked:bg-secondary/40"
            >
              <Radio
                id={`level-${level.value}`}
                value={level.value}
                className="mt-0.5"
              />
              <span className="space-y-1">
                <span className="block font-semibold">{level.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {level.description}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

export function AvailabilityStep({ draft, update }: Props) {
  return (
    <div className="space-y-5">
      <TextField
        name="city"
        label="City"
        value={draft.city}
        onChange={(event) => update("city", event.target.value)}
        maxLength={100}
        autoComplete="address-level2"
      />
      <div
        className="flex flex-wrap gap-3"
        role="group"
        aria-label="Weekly time choices"
      >
        {[2, 5, 10, 20].map((hours) => (
          <Button
            key={hours}
            variant="outline"
            aria-pressed={draft.weeklyHours === String(hours)}
            className="aria-pressed:border-primary aria-pressed:bg-secondary"
            onClick={() => update("weeklyHours", String(hours))}
          >
            {hours} hours
          </Button>
        ))}
      </div>
      <TextField
        name="weeklyHours"
        label="Hours available per week"
        type="number"
        value={draft.weeklyHours}
        onChange={(event) => update("weeklyHours", event.target.value)}
        min={1}
        max={80}
      />
      <p className="text-sm text-muted-foreground">
        You can add a local search area later. No address is needed here.
      </p>
    </div>
  );
}

export function PreferencesStep({ draft, update }: Props) {
  return (
    <div className="space-y-5">
      <LearningGoals
        value={draft.wantsToLearn}
        onChange={(value) => update("wantsToLearn", value)}
      />
      <TextField
        name="interests"
        label="Causes you care about (optional)"
        value={draft.interests}
        onChange={(event) => update("interests", event.target.value)}
        maxLength={3000}
        description="Separate multiple goals or causes with commas."
      />
      <div className="space-y-5 rounded-xl bg-secondary/30 p-4">
        <div className="flex items-start justify-between gap-4">
          <Label htmlFor="starter-volunteer" className="font-sans leading-6">
            Include unpaid volunteer projects
          </Label>
          <Switch
            id="starter-volunteer"
            checked={draft.acceptsVolunteer}
            onCheckedChange={(value) => update("acceptsVolunteer", value)}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <Label htmlFor="starter-discovery" className="font-sans leading-6">
            Let requesters find my profile
          </Label>
          <Switch
            id="starter-discovery"
            checked={draft.discoverable}
            onCheckedChange={(value) => update("discoverable", value)}
          />
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Both choices start off. You can explore privately; responding to
          projects requires visibility. Change these choices later in your
          profile.
        </p>
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Your starting point</dt>
          <dd className="mt-1 font-medium">
            {onboardingList(draft.skills).join(" · ")}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Availability</dt>
          <dd>
            {draft.city} · {draft.weeklyHours} hours per week
          </dd>
        </div>
      </dl>
    </div>
  );
}
