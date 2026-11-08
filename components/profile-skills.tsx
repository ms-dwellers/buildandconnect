"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmButton } from "@/components/dashboards/parts";
import { FieldMessage } from "@/components/forms/form-kit";
import { api } from "@/lib/api";
import type { OwnProfile } from "@/lib/types";
import type { SkillChange } from "@/backend/profile-skills";

const LEVELS = ["Beginner", "Comfortable", "Capable", "Strong", "Expert"].map(
  (label, index) => ({ value: String(index + 1), label }),
);
type Skill = OwnProfile["skills"][number];

export function ProfileSkills({
  profile,
  onSaved,
}: {
  profile: OwnProfile;
  onSaved: () => Promise<void>;
}) {
  const [skills, setSkills] = useState(profile.skills);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setSkills(profile.skills), [profile.skills]);

  async function save(change: SkillChange) {
    if (submitting.current) return false;
    submitting.current = true;
    setPending(true);
    setError(null);
    setNotice("");
    try {
      const result = await api<{ skills: Skill[] }>("/developers/me/skills", {
        method: "PATCH",
        body: JSON.stringify(change),
      });
      if (!result.ok) {
        setError(result.error);
        if (result.status === 409) await onSaved();
        return false;
      }
      setSkills(result.data.skills);
      setNotice(
        change.action === "remove"
          ? `${change.name} removed from your self-ratings. Project backing is preserved.`
          : `${change.name} saved. Your skills are ready for matching.`,
      );
      await onSaved();
      return true;
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      await save({ action: "add", name: name.trim(), level: Number(level) })
    ) {
      setName("");
      setLevel("1");
      requestAnimationFrame(() => input.current?.focus());
    }
  }

  return (
    <Card id="profile-skills" className="scroll-mt-6">
      <CardPanel className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Your skills</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Add skills as you learn. You can go for a project without knowing
            every listed skill.
          </p>
        </div>
        <form
          onSubmit={add}
          className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
        >
          <div className="grid gap-2">
            <Label htmlFor="profile-add-skill">Skill name</Label>
            <Input
              className="min-h-11"
              ref={input}
              id="profile-add-skill"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. React, Python, accessibility"
              required
              maxLength={100}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-add-skill-level">Your current level</Label>
            <SkillLevel
              id="profile-add-skill-level"
              value={level}
              onChange={setLevel}
              disabled={pending}
            />
          </div>
          <Button
            type="submit"
            className="min-h-11"
            disabled={pending || !name.trim() || skills.length >= 30}
          >
            {pending ? "Saving…" : "Add skill"}
          </Button>
        </form>
        <FieldMessage>{error}</FieldMessage>
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
        <ul className="divide-y border-y">
          {skills.map((skill) => (
            <SkillRow
              key={`${skill.name}:${skill.level}`}
              skill={skill}
              disabled={pending}
              canRemove={skills.length > 1}
              backing={
                profile.skillEvidence?.find((item) => item.name === skill.name)
                  ?.projects.length ?? 0
              }
              onSave={save}
            />
          ))}
        </ul>
        {profile.skillEvidence
          ?.filter(
            (backing) => !skills.some((skill) => skill.name === backing.name),
          )
          .map((backing) => (
            <div
              key={backing.name}
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <p>
                <span className="font-medium">{backing.name}</span> ·{" "}
                {backing.projects.length} requester-confirmed{" "}
                {backing.projects.length === 1 ? "project" : "projects"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => {
                  setName(backing.name);
                  input.current?.focus();
                }}
              >
                Add a self-rating
              </Button>
            </div>
          ))}
        <p className="text-xs leading-5 text-muted-foreground">
          {skills.length} of 30 skills. Levels are self-rated; confirmed project
          work provides separate backing. Keep at least one listed skill.
        </p>
      </CardPanel>
    </Card>
  );
}

function SkillRow({
  skill,
  disabled,
  canRemove,
  backing,
  onSave,
}: {
  skill: Skill;
  disabled: boolean;
  canRemove: boolean;
  backing: number;
  onSave: (change: SkillChange) => Promise<boolean>;
}) {
  const [level, setLevel] = useState(String(skill.level));
  return (
    <li className="grid items-center gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
      <div className="min-w-0 space-y-1">
        <p className="font-medium [overflow-wrap:anywhere]">{skill.name}</p>
        <p className="text-xs text-muted-foreground">
          {backing
            ? `${backing} requester-confirmed ${backing === 1 ? "project" : "projects"}`
            : "Self-reported · no confirmed project backing yet"}
        </p>
      </div>
      <SkillLevel
        ariaLabel={`Your level in ${skill.name}`}
        value={level}
        onChange={setLevel}
        disabled={disabled}
      />
      <div className="flex flex-wrap gap-2">
        {Number(level) !== skill.level && (
          <Button
            size="sm"
            className="min-h-11"
            disabled={disabled}
            onClick={() =>
              void onSave({
                action: "set-level",
                name: skill.name,
                level: Number(level),
                expectedLevel: skill.level,
              })
            }
          >
            Save level
          </Button>
        )}
        <ConfirmButton
          label="Remove"
          className="min-h-11"
          aria-label={`Remove ${skill.name}`}
          size="sm"
          variant="ghost"
          disabled={disabled || !canRemove}
          title={`Remove ${skill.name}?`}
          description="This removes your self-rating, not any requester-confirmed project work."
          confirmLabel="Remove skill"
          onConfirm={() =>
            void onSave({
              action: "remove",
              name: skill.name,
              expectedLevel: skill.level,
            })
          }
        />
      </div>
    </li>
  );
}

function SkillLevel({
  id,
  ariaLabel,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      items={LEVELS}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="min-h-11 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {LEVELS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
