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
  FieldMessage,
  FormSection,
  TextField,
  TextAreaField,
  parseList,
} from "@/components/forms/form-kit";
import {
  confirmedBriefSchema,
  type HiringBrief,
} from "@/backend/hiring/schemas";
import { useState } from "react";

type Option = { value: string; label: string };

function SelectField({
  id,
  name,
  label,
  defaultValue,
  items,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  items: Option[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select name={name} defaultValue={defaultValue} items={items}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}

export function BriefForm({
  brief,
  pending,
  disabled,
  onSubmit,
  preview = false,
  submitDisabled = false,
}: {
  brief: HiringBrief;
  pending: boolean;
  disabled: boolean;
  onSubmit: (brief: HiringBrief) => void;
  preview?: boolean;
  submitDisabled?: boolean;
}) {
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || pending || disabled || submitDisabled) return;
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
  const arrangement: Option[] = [
    { value: "", label: "Not decided" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "Onsite" },
    { value: "flexible", label: "Flexible" },
  ];
  const kinds: Option[] = [
    { value: "", label: "Not decided" },
    { value: "paid", label: "Paid" },
    { value: "volunteer", label: "Volunteer" },
  ];
  const periods: Option[] = [
    { value: "", label: "Not decided" },
    { value: "hour", label: "Per hour" },
    { value: "project", label: "Per project" },
    { value: "month", label: "Per month" },
    { value: "year", label: "Per year" },
  ];
  return (
    <Form onSubmit={submit} className="space-y-5">
      <fieldset disabled={pending || disabled} className="space-y-8">
        <FormSection title="The project">
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
            name="technologies"
            label="Technologies, if you have a preference"
            description="Preferences guide suggestions; they never exclude developers."
            defaultValue={brief.technologies.join(", ")}
          />
        </FormSection>
        <FormSection title="Who it helps">
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
        </FormSection>
        <FormSection title="Time and place">
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              id="hiring-arrangement"
              name="workArrangement"
              label="Work arrangement"
              defaultValue={brief.workArrangement ?? ""}
              items={arrangement}
            />
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
          </div>
        </FormSection>
        <FormSection title="Compensation">
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              id="hiring-kind"
              name="kind"
              label="Paid or volunteer"
              defaultValue={brief.compensation.kind ?? ""}
              items={kinds}
            />
            <SelectField
              id="hiring-period"
              name="period"
              label="Budget basis"
              defaultValue={brief.compensation.period ?? ""}
              items={periods}
            />
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
        </FormSection>
      </fieldset>
      {!preview && (
        <>
          <div className="flex items-start gap-3">
            <Checkbox
              id="hiring-consent"
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              disabled={pending || disabled}
            />
            <Label htmlFor="hiring-consent" className="text-sm leading-6">
              I’ve reviewed this brief and agree to send it to the configured AI
              provider for developer suggestions.
            </Label>
          </div>
          <FieldMessage>{error}</FieldMessage>
          <Button
            type="submit"
            disabled={!consent || disabled || submitDisabled}
            loading={pending}
          >
            Find up to 10 developers
          </Button>
        </>
      )}
    </Form>
  );
}
