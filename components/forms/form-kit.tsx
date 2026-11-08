"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ApiIssue } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Server validation issues keyed by top-level field, for Base UI `Form`. */
export function issuesToErrors(issues: ApiIssue[] | undefined) {
  const errors: Record<string, string> = {};
  for (const issue of issues ?? []) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Comma-separated input to a trimmed, de-duplicated list. */
export function parseList(value: FormDataEntryValue | null) {
  return [
    ...new Set(
      String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function TextField({
  name,
  label,
  description,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "name"> & {
  name: string;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Field name={name} className={className ?? "w-full"}>
      <FieldLabel>{label}</FieldLabel>
      <Input name={name} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError />
    </Field>
  );
}

export function TextAreaField({
  name,
  label,
  description,
  ...props
}: Omit<ComponentProps<typeof Textarea>, "name"> & {
  name: string;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Field name={name} className="w-full">
      <FieldLabel>{label}</FieldLabel>
      <Textarea name={name} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError />
    </Field>
  );
}

export function FormSection({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <fieldset id={id} className="w-full scroll-mt-6 space-y-5">
      <legend className="mb-4 text-lg font-semibold tracking-tight">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

type Choice<T extends string> = { value: T; label: string };

/**
 * A short, mutually exclusive choice rendered as a labelled radio row. The
 * fieldset and legend give assistive technology the group's name.
 */
export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  choices,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  choices: Choice<T>[];
}) {
  return (
    <Fieldset className="space-y-2.5">
      <FieldsetLegend className="text-sm font-medium">{label}</FieldsetLegend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="flex flex-row flex-wrap gap-x-6 gap-y-3"
      >
        {choices.map((choice) => (
          <Label key={choice.value} className="font-normal">
            <Radio value={choice.value} />
            {choice.label}
          </Label>
        ))}
      </RadioGroup>
    </Fieldset>
  );
}

/** Progress copy for the posting forms while Workers AI analyses the text. */
export function AnalysisStatus({ pending }: { pending: boolean }) {
  if (!pending) return null;
  return (
    <p role="status" className="text-sm text-muted-foreground">
      Analysing with AI. This usually takes a few seconds and at most a minute.
    </p>
  );
}

/**
 * Inline feedback beside a control or action. It renders nothing while there
 * is no message, so screen readers never meet an empty live region.
 */
export function FieldMessage({
  children,
  className,
  id,
}: {
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn("text-sm text-destructive-foreground", className)}
    >
      {children}
    </p>
  );
}
