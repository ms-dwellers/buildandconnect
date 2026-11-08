"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  RequireRole,
  ErrorAlert,
  LoadingBlock,
} from "@/components/app/require-role";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import {
  TextField,
  TextAreaField,
  parseList,
  issuesToErrors,
} from "@/components/forms/form-kit";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api";
import type { OwnProfile } from "@/lib/types";

const levels = [
  { value: "1", label: "Beginner" },
  { value: "2", label: "Comfortable" },
  { value: "3", label: "Capable" },
  { value: "4", label: "Strong" },
  { value: "5", label: "Expert" },
];

export function DeveloperOnboarding({ next = "/career" }: { next?: string }) {
  return (
    <RequireRole roles={["developer"]}>
      {({ user }) => <Load key={user.id} next={next} />}
    </RequireRole>
  );
}
function Load({ next }: { next: string }) {
  const profile = useApi<OwnProfile>("/developers/me");
  const router = useRouter();
  useEffect(() => {
    if (profile.data) router.replace(next);
  }, [profile.data, next, router]);
  if (profile.error && profile.error.status !== 404)
    return (
      <ErrorAlert
        title="Profile could not be loaded"
        message={profile.error.message}
        onRetry={() => void profile.reload()}
      />
    );
  if (profile.loading || profile.data) return <LoadingBlock />;
  return <StarterProfile next={next} />;
}

export function StarterProfile({ next = "/career" }: { next?: string }) {
  const router = useRouter();
  const [level, setLevel] = useState<string | null>(null);
  const [discoverable, setDiscoverable] = useState(false);
  const [volunteer, setVolunteer] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const levelTrigger = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!level) {
      setError("Choose your current experience level.");
      levelTrigger.current?.focus();
      return;
    }
    const data = new FormData(event.currentTarget);
    busy.current = true;
    setPending(true);
    setError("");
    setErrors({});
    try {
      const response = await api("/developers/me", {
        method: "PUT",
        body: JSON.stringify({
          bio: String(data.get("bio")),
          city: String(data.get("city")),
          skills: parseList(data.get("skills")).map((name) => ({
            name,
            level: Number(level),
          })),
          projects: [],
          interests: parseList(data.get("interests")),
          wantsToLearn: parseList(data.get("wantsToLearn")),
          experienceLevel: Number(level),
          collaboration: "flexible",
          weeklyHours: Number(data.get("weeklyHours")),
          acceptsVolunteer: volunteer,
          available: true,
          discoverable,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) {
        setError(response.error);
        setErrors(issuesToErrors(response.issues));
        return;
      }
      router.replace(next);
    } catch {
      setError(
        "Your profile could not be saved. Your entries are still here; check your connection and retry.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Card>
      <CardPanel className="space-y-5 p-5 sm:p-7">
        <p className="text-sm text-muted-foreground">
          Add a few basics to find relevant projects. Past projects, detailed
          preferences, and a local search area can come later.
        </p>
        <Form onSubmit={submit} errors={errors} className="space-y-5">
          <fieldset disabled={pending} className="space-y-5">
            <TextAreaField
              name="bio"
              label="What do you enjoy building?"
              required
              minLength={10}
              maxLength={2000}
              rows={3}
            />
            <TextField
              name="skills"
              label="Skills you have tried"
              description="Separate skills with commas, for example React, HTML, CSS."
              required
              maxLength={3000}
            />
            <div className="space-y-2">
              <Label htmlFor="starting-level">
                Your current level with these skills
              </Label>
              <Select value={level} onValueChange={setLevel} items={levels}>
                <SelectTrigger
                  ref={levelTrigger}
                  id="starting-level"
                  className="w-full"
                >
                  <SelectValue placeholder="Choose your current level" />
                </SelectTrigger>
                <SelectPopup>
                  {levels.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="city" label="City" required maxLength={100} />
              <TextField
                name="weeklyHours"
                label="Hours available per week"
                type="number"
                required
                min={1}
                max={80}
              />
            </div>
            <TextField
              name="wantsToLearn"
              label="What would you like to learn? (optional)"
              maxLength={3000}
            />
            <TextField
              name="interests"
              label="Causes you care about (optional)"
              maxLength={3000}
            />
            <div className="flex items-center gap-3">
              <Switch
                id="starter-volunteer"
                checked={volunteer}
                onCheckedChange={setVolunteer}
              />
              <Label htmlFor="starter-volunteer">
                Include unpaid volunteer projects
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="starter-discovery"
                checked={discoverable}
                onCheckedChange={setDiscoverable}
              />
              <Label htmlFor="starter-discovery">
                Let requesters find my profile
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              You can explore privately. Responding to projects requires profile
              visibility, which you can change later. Collaboration starts as
              flexible; adjust it in your profile.
            </p>
          </fieldset>
          {error && <ErrorAlert title="Profile not saved" message={error} />}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={pending}>
              Save and continue
            </Button>
            <Button
              render={<a href="/map" />}
              variant="ghost"
              disabled={pending}
            >
              Browse the map first
            </Button>
          </div>
        </Form>
      </CardPanel>
    </Card>
  );
}
