"use client";

import type { FormEvent } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TextField,
  TextAreaField,
  parseList,
} from "@/components/forms/form-kit";
import {
  confirmedBriefSchema,
  type HiringBrief,
} from "@/backend/hiring/schemas";
import { useState } from "react";

export function BriefForm({
  brief,
  pending,
  disabled,
  onSubmit,
}: {
  brief: HiringBrief;
  pending: boolean;
  disabled: boolean;
  onSubmit: (brief: HiringBrief) => void;
}) {
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim() || null;
    const number = (name: string) =>
      text(name) === null ? null : Number(text(name));
    const result = confirmedBriefSchema.safeParse({
      brief: {
        title: text("title"),
        description: text("description"),
        technologies: parseList(data.get("technologies")),
        causes: parseList(data.get("causes")),
        communitiesServed: parseList(data.get("communitiesServed")),
        workArrangement: text("workArrangement"),
        location: text("location"),
        weeklyHours: number("weeklyHours"),
        timeline: text("timeline"),
        compensation: {
          kind: text("kind"),
          currency: text("currency")?.toUpperCase() ?? null,
          period: text("period"),
          minimum: number("minimum"),
          maximum: number("maximum"),
        },
      },
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError("");
    onSubmit(result.data.brief);
  }
  const arrangement = [
    { value: "", label: "Not decided" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "Onsite" },
    { value: "flexible", label: "Flexible" },
  ];
  const kinds = [
    { value: "", label: "Not decided" },
    { value: "paid", label: "Paid" },
    { value: "volunteer", label: "Volunteer" },
  ];
  const periods = [
    { value: "", label: "Not decided" },
    { value: "hour", label: "Per hour" },
    { value: "project", label: "Per project" },
    { value: "month", label: "Per month" },
    { value: "year", label: "Per year" },
  ];
  return (
    <Form onSubmit={submit} className="space-y-5">
      <fieldset disabled={pending || disabled} className="space-y-5">
        <TextField
          name="title"
          label="Project title"
          defaultValue={brief.title ?? ""}
          required
          maxLength={200}
        />
        <TextAreaField
          name="description"
          label="What needs to be built?"
          defaultValue={brief.description ?? ""}
          required
          maxLength={6000}
        />
        <TextField
          name="causes"
          label="Causes and interests"
          defaultValue={brief.causes.join(", ")}
          placeholder="Digital inclusion, community"
        />
        <TextField
          name="communitiesServed"
          label="Who will this help?"
          defaultValue={brief.communitiesServed.join(", ")}
          placeholder="Older adults"
        />
        <TextField
          name="technologies"
          label="Technologies, if you have a preference"
          defaultValue={brief.technologies.join(", ")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hiring-arrangement">Work arrangement</Label>
            <Select
              name="workArrangement"
              defaultValue={brief.workArrangement ?? ""}
              items={arrangement}
            >
              <SelectTrigger id="hiring-arrangement" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {arrangement.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <TextField
            name="location"
            label="City or area"
            defaultValue={brief.location ?? ""}
            maxLength={200}
          />
          <TextField
            name="weeklyHours"
            label="Hours per week"
            type="number"
            min={1}
            max={80}
            defaultValue={brief.weeklyHours ?? ""}
          />
          <TextField
            name="timeline"
            label="Timeline"
            defaultValue={brief.timeline ?? ""}
            maxLength={200}
          />
          <div className="space-y-2">
            <Label htmlFor="hiring-kind">Compensation</Label>
            <Select
              name="kind"
              defaultValue={brief.compensation.kind ?? ""}
              items={kinds}
            >
              <SelectTrigger id="hiring-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {kinds.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hiring-period">Budget basis</Label>
            <Select
              name="period"
              defaultValue={brief.compensation.period ?? ""}
              items={periods}
            >
              <SelectTrigger id="hiring-period" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {periods.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <TextField
            name="minimum"
            label="Minimum budget"
            type="number"
            min={0}
            max={1000000}
            step="any"
            defaultValue={brief.compensation.minimum ?? ""}
          />
          <TextField
            name="maximum"
            label="Maximum budget"
            type="number"
            min={0}
            max={1000000}
            step="any"
            defaultValue={brief.compensation.maximum ?? ""}
          />
          <TextField
            name="currency"
            label="Currency code"
            defaultValue={brief.compensation.currency ?? ""}
            placeholder="CAD"
            minLength={3}
            maxLength={3}
          />
        </div>
      </fieldset>
      <div className="flex items-start gap-3">
        <Checkbox
          id="hiring-consent"
          checked={consent}
          onCheckedChange={(value) => setConsent(value === true)}
          disabled={pending || disabled}
        />
        <Label htmlFor="hiring-consent" className="text-sm leading-6">
          I’ve reviewed this brief and agree to send it to Gemini through
          OpenRouter for developer suggestions.
        </Label>
      </div>
      <p role="alert" className="text-sm text-destructive-foreground">
        {error}
      </p>
      <Button type="submit" disabled={!consent || disabled} loading={pending}>
        Find up to 10 developers
      </Button>
    </Form>
  );
}
