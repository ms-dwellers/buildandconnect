"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApiIssue } from "@/lib/api";

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
