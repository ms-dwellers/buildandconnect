"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ErrorAlert } from "@/components/app/require-role";
import { TextField } from "@/components/forms/form-kit";
import { ChoiceGroup } from "@/components/forms/form-kit";
import { toastManager } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { OwnProfile } from "@/lib/types";
import {
  developerPreferencesOf,
  developerPreferencesSchema,
} from "@/backend/schemas";

type Arrangement = "unknown" | "remote" | "hybrid" | "onsite" | "flexible";

export function DeveloperPreferencesForm({
  initial,
  onSaved,
}: {
  initial?: OwnProfile;
  onSaved: () => Promise<void>;
}) {
  const preferences = developerPreferencesOf(initial);
  const [arrangement, setArrangement] = useState<Arrangement>(
    preferences.workArrangementPreference?.preferred ?? "unknown",
  );
  const [required, setRequired] = useState(
    preferences.workArrangementPreference?.required ?? false,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initial || pending) return;
    const data = new FormData(event.currentTarget);
    const number = (name: string) =>
      String(data.get(name) ?? "").trim() === ""
        ? null
        : Number(data.get(name));
    const minimumHourlyRate = number("minimumHourlyRate");
    const preferredHourlyRate = number("preferredHourlyRate");
    const result = developerPreferencesSchema.safeParse({
      professionalExperienceYears: number("professionalExperienceYears"),
      compensationPreference:
        minimumHourlyRate === null && preferredHourlyRate === null
          ? null
          : {
              currency: String(data.get("currency") ?? ""),
              minimumHourlyRate,
              preferredHourlyRate,
            },
      workArrangementPreference:
        arrangement === "unknown" ? null : { preferred: arrangement, required },
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await api("/developers/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(result.data),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      await onSaved();
      toastManager.add({
        title: "Matching preferences saved",
        type: "success",
      });
    } catch {
      setError(
        "Preferences could not be saved. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardPanel className="space-y-5 p-5 sm:p-8">
        <h2 className="text-lg font-semibold">Matching preferences</h2>
        <p className="text-sm text-muted-foreground">
          Leave unknown details blank. Zero years is valid; personal and
          volunteer projects still count.
        </p>
        {!initial && (
          <p className="text-sm text-muted-foreground">
            Create your profile first to save these preferences.
          </p>
        )}
        <Form onSubmit={save} className="space-y-6">
          <fieldset disabled={!initial || pending} className="space-y-6">
            <TextField
              name="professionalExperienceYears"
              className="w-full sm:max-w-sm"
              label="Years of professional experience"
              type="number"
              min={0}
              max={80}
              step="any"
              defaultValue={preferences.professionalExperienceYears ?? ""}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                name="minimumHourlyRate"
                label="Minimum hourly rate"
                description="A firm minimum for paid hourly work."
                type="number"
                min={0}
                max={10000}
                step="any"
                defaultValue={
                  preferences.compensationPreference?.minimumHourlyRate ?? ""
                }
              />
              <TextField
                name="preferredHourlyRate"
                label="Preferred hourly rate"
                description="A preference, not a cutoff."
                type="number"
                min={0}
                max={10000}
                step="any"
                defaultValue={
                  preferences.compensationPreference?.preferredHourlyRate ?? ""
                }
              />
              <TextField
                name="currency"
                label="Currency code"
                minLength={3}
                maxLength={3}
                defaultValue={
                  preferences.compensationPreference?.currency ?? "CAD"
                }
              />
            </div>
            <ChoiceGroup
              label="Preferred work arrangement"
              value={arrangement}
              onChange={(next) => {
                setArrangement(next);
                if (next === "unknown" || next === "flexible")
                  setRequired(false);
              }}
              choices={[
                { value: "unknown", label: "Not decided" },
                { value: "flexible", label: "Flexible" },
                { value: "remote", label: "Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "onsite", label: "Onsite" },
              ]}
            />
            <div className="flex items-center gap-3">
              <Switch
                id="required-work-arrangement"
                checked={required}
                onCheckedChange={setRequired}
                disabled={
                  arrangement === "unknown" || arrangement === "flexible"
                }
              />
              <Label htmlFor="required-work-arrangement">
                Only show this work arrangement
              </Label>
            </div>
          </fieldset>
          {error && (
            <ErrorAlert title="Preferences not saved" message={error} />
          )}
          <Button type="submit" loading={pending} disabled={!initial}>
            Save matching preferences
          </Button>
        </Form>
      </CardPanel>
    </Card>
  );
}
