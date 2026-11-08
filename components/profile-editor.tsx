"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StarterProfile } from "@/components/developer-onboarding";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { MapPinPicker, type Pin } from "@/components/MapPinPicker";
import {
  ErrorAlert,
  LoadingBlock,
  RequireRole,
} from "@/components/app/require-role";
import { ChoiceGroup } from "@/components/forms/opportunity-form";
import {
  FormSection,
  TextAreaField,
  TextField,
  issuesToErrors,
  parseList,
} from "@/components/forms/form-kit";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { DeveloperProfile, OwnProfile } from "@/lib/types";
import { DeveloperPreferencesForm } from "@/components/developer-preferences-form";
import { DeveloperProfileView } from "@/components/developer-profile";
import { LearningGoals } from "@/components/learning-goals";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";

const LEVELS = [
  { value: "1", label: "1 · Beginner" },
  { value: "2", label: "2 · Comfortable" },
  { value: "3", label: "3 · Capable" },
  { value: "4", label: "4 · Strong" },
  { value: "5", label: "5 · Expert" },
];

type Skill = DeveloperProfile["skills"][number];
type Project = { title: string; description: string; technologies: string };

export function ProfileEditor({ next = null }: { next?: string | null }) {
  return (
    <RequireRole roles={["developer"]}>
      {({ user }) => <LoadProfile key={user.id} next={next} />}
    </RequireRole>
  );
}

function LoadProfile({ next }: { next: string | null }) {
  const profile = useApi<OwnProfile>("/developers/me");
  const router = useRouter();
  if (profile.error?.status === 404)
    return <StarterProfile next={next ?? "/career"} />;
  if (profile.error && profile.error.status !== 404)
    return (
      <ErrorAlert
        title="Your profile could not be loaded"
        message={profile.error.message}
        onRetry={() => void profile.reload()}
      />
    );
  if (profile.loading && !profile.data) return <LoadingBlock />;
  const saveAndReturn = async () => {
    await profile.reload();
    if (next) router.push(next);
  };
  return (
    <div className="space-y-10">
      {next && (
        <Button render={<a href={next} />} variant="outline">
          Return to project
        </Button>
      )}
      {profile.data && (
        <div className="rounded-2xl border bg-secondary/30 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">
            Make your work easy to trust
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Share what you built, what you contributed and what changed. Your
            preview shows the same profile requesters can see when you turn
            visibility on.
          </p>
          <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <li>
              {profile.data.projects.length
                ? "✓ Project evidence added"
                : "Add your first project"}
            </li>
            <li>
              {profile.data.wantsToLearn.length
                ? "✓ Learning goals added"
                : "Choose learning goals"}
            </li>
            <li>
              {profile.data.discoverable
                ? "✓ Visible to requesters"
                : "Private: only you see this preview"}
            </li>
          </ul>
        </div>
      )}
      <Tabs defaultValue={next ? "edit" : "preview"} className="gap-6">
        <TabsList
          variant="underline"
          aria-label="Profile workspace"
          className="max-w-full flex-wrap"
        >
          <TabsTab value="preview">Profile preview</TabsTab>
          <TabsTab value="edit">Edit profile</TabsTab>
          <TabsTab value="preferences">Matching & area</TabsTab>
        </TabsList>
        <TabsPanel value="preview" keepMounted>
          {profile.data && <DeveloperProfileView profile={profile.data} />}
        </TabsPanel>
        <TabsPanel value="edit" keepMounted>
          <ProfileForm
            initial={profile.data}
            onSaved={saveAndReturn}
            returnToProject={!!next}
          />
        </TabsPanel>
        <TabsPanel value="preferences" keepMounted className="space-y-6">
          <DeveloperPreferencesForm
            initial={profile.data}
            onSaved={profile.reload}
          />
          <AreaForm
            profile={profile.data}
            onSaved={saveAndReturn}
            returnToProject={!!next}
          />
        </TabsPanel>
      </Tabs>
    </div>
  );
}

function ProfileForm({
  initial,
  onSaved,
  returnToProject = false,
}: {
  initial?: OwnProfile;
  onSaved: () => Promise<void>;
  returnToProject?: boolean;
}) {
  const [skills, setSkills] = useState<Skill[]>(
    initial?.skills.length ? initial.skills : [{ name: "", level: 2 }],
  );
  const [projects, setProjects] = useState<Project[]>(
    (initial?.projects ?? []).map((project) => ({
      ...project,
      technologies: project.technologies.join(", "),
    })),
  );
  const [experience, setExperience] = useState(
    String(initial?.experienceLevel ?? 1),
  );
  const [collaboration, setCollaboration] = useState<
    DeveloperProfile["collaboration"]
  >(initial?.collaboration ?? "flexible");
  const [flags, setFlags] = useState({
    acceptsVolunteer: initial?.acceptsVolunteer ?? true,
    available: initial?.available ?? true,
    discoverable: initial?.discoverable ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [learningGoals, setLearningGoals] = useState(
    initial?.wantsToLearn.join(", ") ?? "",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const profile: DeveloperProfile = {
      bio: String(data.get("bio")),
      city: String(data.get("city")),
      skills: skills
        .filter((skill) => skill.name.trim())
        .map((skill) => ({ name: skill.name.trim(), level: skill.level })),
      projects: projects
        .filter((project) => project.title.trim())
        .map((project) => ({
          title: project.title.trim(),
          description: project.description.trim(),
          technologies: parseList(project.technologies),
        })),
      interests: parseList(data.get("interests")),
      wantsToLearn: parseList(data.get("wantsToLearn")),
      experienceLevel: Number(experience),
      collaboration,
      weeklyHours: Number(data.get("weeklyHours")),
      ...flags,
    };
    setPending(true);
    setFailure(null);
    try {
      const result = await api("/developers/me", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      if (!result.ok) {
        setErrors(issuesToErrors(result.issues));
        setFailure(result.error);
        return;
      }
      setErrors({});
      toastManager.add({
        title: initial ? "Profile saved" : "Profile created",
        description: initial
          ? undefined
          : "Next, set your area to see nearby requests.",
        type: "success",
      });
      await onSaved();
    } catch {
      setFailure(
        "Your profile could not be saved. Check your connection and retry; your entries are still here.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardPanel className="p-6">
        <Form
          onSubmit={submit}
          errors={errors}
          className="mx-auto max-w-3xl space-y-10"
        >
          <FormSection title="About you">
            <TextAreaField
              name="bio"
              label="Bio"
              description="What you build and what kind of work you're looking for. At least 10 characters."
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              defaultValue={initial?.bio}
            />
            <div className="grid w-full gap-5 sm:grid-cols-2">
              <TextField
                name="city"
                label="City"
                required
                maxLength={100}
                defaultValue={initial?.city ?? "Calgary"}
              />
              <TextField
                name="weeklyHours"
                label="Hours available per week"
                type="number"
                required
                min={1}
                max={80}
                defaultValue={initial?.weeklyHours ?? 8}
              />
            </div>
            <div className="w-full space-y-2">
              <Label htmlFor="experience-level">Overall experience</Label>
              <Select
                items={LEVELS}
                value={experience}
                onValueChange={(value) => value && setExperience(value)}
              >
                <SelectTrigger id="experience-level" className="sm:max-w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </FormSection>

          <FormSection title="Skills">
            <ul className="w-full space-y-3">
              {skills.map((skill, index) => (
                <li key={index} className="flex flex-wrap items-end gap-3">
                  <div className="min-w-48 flex-1 space-y-2">
                    <Label htmlFor={`skill-${index}`}>Skill</Label>
                    <Input
                      id={`skill-${index}`}
                      value={skill.name}
                      maxLength={100}
                      required={index === 0}
                      placeholder="React"
                      onChange={(event) =>
                        setSkills((current) =>
                          current.map((item, i) =>
                            i === index
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`skill-level-${index}`}>Level</Label>
                    <Select
                      items={LEVELS}
                      value={String(skill.level)}
                      onValueChange={(value) =>
                        value &&
                        setSkills((current) =>
                          current.map((item, i) =>
                            i === index
                              ? { ...item, level: Number(value) }
                              : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger
                        id={`skill-level-${index}`}
                        className="w-44"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={skills.length === 1}
                    aria-label={`Remove skill ${skill.name || index + 1}`}
                    onClick={() =>
                      setSkills((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
            {errors.skills && (
              <p role="alert" className="text-sm text-destructive-foreground">
                {errors.skills}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={skills.length >= 30}
              onClick={() =>
                setSkills((current) => [...current, { name: "", level: 2 }])
              }
            >
              <PlusIcon aria-hidden="true" />
              Add a skill
            </Button>
          </FormSection>

          <FormSection title="Projects">
            <p className="text-sm text-muted-foreground">
              Show what you contributed and the result, not just the stack.
              Personal, school and volunteer work all count. Requesters can see
              these self-reported examples when your profile is visible.
            </p>
            <ul className="w-full space-y-4">
              {projects.map((project, index) => {
                const update = (patch: Partial<Project>) =>
                  setProjects((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, ...patch } : item,
                    ),
                  );
                return (
                  <li key={index} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`project-title-${index}`}>Title</Label>
                        <Input
                          id={`project-title-${index}`}
                          value={project.title}
                          required
                          maxLength={100}
                          onChange={(event) =>
                            update({ title: event.target.value })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove project ${project.title || index + 1}`}
                        onClick={() =>
                          setProjects((current) =>
                            current.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`project-description-${index}`}>
                        What you built
                      </Label>
                      <Textarea
                        id={`project-description-${index}`}
                        value={project.description}
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={3}
                        placeholder="The problem, what I built, and the result. Include a demo or repository URL if you have one."
                        onChange={(event) =>
                          update({ description: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`project-tech-${index}`}>
                        Technologies, separated by commas
                      </Label>
                      <Input
                        id={`project-tech-${index}`}
                        value={project.technologies}
                        onChange={(event) =>
                          update({ technologies: event.target.value })
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {errors.projects && (
              <p role="alert" className="text-sm text-destructive-foreground">
                {errors.projects}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={projects.length >= 10}
              onClick={() =>
                setProjects((current) => [
                  ...current,
                  { title: "", description: "", technologies: "" },
                ])
              }
            >
              <PlusIcon aria-hidden="true" />
              Add a project
            </Button>
          </FormSection>

          <FormSection title="Growth and interests">
            <LearningGoals value={learningGoals} onChange={setLearningGoals} />
            <TextField
              name="interests"
              label="Causes you care about"
              description="Separated by commas."
              defaultValue={initial?.interests.join(", ")}
              placeholder="community, sustainability"
            />
            <ChoiceGroup
              label="How you like to collaborate"
              value={collaboration}
              onChange={setCollaboration}
              choices={[
                { value: "flexible", label: "Flexible" },
                { value: "async", label: "Mostly async" },
                { value: "sync", label: "Live sessions" },
              ]}
            />
          </FormSection>

          <FormSection title="Availability">
            {(
              [
                ["available", "Available for new work"],
                ["discoverable", "Visible to requesters"],
                ["acceptsVolunteer", "Open to volunteer projects"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <Switch
                  id={`profile-${key}`}
                  checked={flags[key]}
                  onCheckedChange={(value) =>
                    setFlags((current) => ({ ...current, [key]: value }))
                  }
                />
                <Label htmlFor={`profile-${key}`}>{label}</Label>
              </div>
            ))}
          </FormSection>

          {failure && (
            <ErrorAlert title="Profile not saved" message={failure} />
          )}
          <Button type="submit" loading={pending}>
            {returnToProject
              ? "Save profile and return"
              : initial
                ? "Save profile"
                : "Create profile"}
          </Button>
        </Form>
      </CardPanel>
    </Card>
  );
}

function AreaForm({
  profile,
  onSaved,
  returnToProject = false,
}: {
  profile?: OwnProfile;
  onSaved: () => Promise<void>;
  returnToProject?: boolean;
}) {
  const [pin, setPin] = useState<Pin | null>(
    profile?.location ? { ...profile.location, place: "Your area" } : null,
  );
  const [radius, setRadius] = useState(profile?.location?.radiusKm ?? 10);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function save() {
    if (!pin || pending) return;
    setPending(true);
    setFailure(null);
    try {
      const result = await api("/developers/me/location", {
        method: "PATCH",
        body: JSON.stringify({
          latitude: pin.latitude,
          longitude: pin.longitude,
          radiusKm: radius,
        }),
      });
      if (!result.ok) {
        setFailure(result.error);
        return;
      }
      toastManager.add({ title: "Area saved", type: "success" });
      await onSaved();
    } catch {
      setFailure(
        "Your area could not be saved. Check your connection and retry.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card id="area" className="scroll-mt-6">
      <CardPanel className="space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Your area</h2>
          <p className="text-sm text-muted-foreground">
            Requests inside this radius appear on your dashboard. Your pin is
            never shown to anyone else.
          </p>
        </div>
        {!profile ? (
          <p className="text-sm text-muted-foreground">
            Create your profile first, then set your area.
          </p>
        ) : (
          <>
            <MapPinPicker value={pin} onChange={setPin} radiusKm={radius} />
            <div className="max-w-md space-y-3">
              <div className="flex justify-between text-sm">
                <Label htmlFor="area-radius">Radius</Label>
                <span className="tabular-nums">{radius} km</span>
              </div>
              <Slider
                id="area-radius"
                min={1}
                max={50}
                value={radius}
                onValueChange={(value) =>
                  setRadius(Array.isArray(value) ? value[0] : value)
                }
                getAriaLabel={() => "Search radius in kilometres"}
              />
            </div>
            {failure && <ErrorAlert title="Area not saved" message={failure} />}
            <Button
              loading={pending}
              disabled={!pin}
              onClick={() => void save()}
            >
              {returnToProject ? "Save area and return" : "Save area"}
            </Button>
          </>
        )}
      </CardPanel>
    </Card>
  );
}
