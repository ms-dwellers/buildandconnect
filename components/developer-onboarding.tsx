"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import {
  RequireRole,
  ErrorAlert,
  LoadingBlock,
} from "@/components/app/require-role";
import { AccountShell } from "@/components/app/account-shell";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { issuesToErrors } from "@/components/forms/form-kit";
import {
  AboutStep,
  AvailabilityStep,
  PreferencesStep,
  SkillsStep,
} from "@/components/onboarding/profile-steps";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api";
import {
  emptyProfileDraft,
  onboardingFieldStep,
  onboardingProfile,
  onboardingStepErrors,
  PROFILE_STEPS,
  type ProfileDraft,
} from "@/lib/onboarding";
import { developerSchema } from "@/backend/schemas";
import type { OwnProfile } from "@/lib/types";

const questions = [
  "What have you tried?",
  "Tell us a little about yourself",
  "Make room for a project",
  "Choose what works for you",
];
const steps = [SkillsStep, AboutStep, AvailabilityStep, PreferencesStep];

export function DeveloperOnboarding({ next }: { next?: string | null }) {
  return (
    <AccountShell title="Your starting point">
      <RequireRole roles={["developer"]}>
        {({ user }) => <Load key={user.id} next={next} />}
      </RequireRole>
    </AccountShell>
  );
}

function Load({ next }: { next?: string | null }) {
  const profile = useApi<OwnProfile>("/developers/me");
  const router = useRouter();
  useEffect(() => {
    if (profile.data) router.replace(next ?? "/dashboard");
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
  return <StarterProfile next={next ?? "/career"} />;
}

export function StarterProfile({ next = "/career" }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  function update<K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError("");
  }
  function showErrors(fields: Record<string, string>, message: string) {
    setErrors(fields);
    setError(message);
    const field = Object.keys(fields)[0];
    if (field) setStep(onboardingFieldStep(field));
    requestAnimationFrame(() => {
      const input =
        field &&
        form.current?.querySelector<HTMLElement>(
          `[name="${CSS.escape(field)}"], [aria-invalid="true"]`,
        );
      if (input && input.tabIndex >= 0) input.focus();
      else heading.current?.focus();
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const fields = onboardingStepErrors(draft, step);
    if (Object.keys(fields).length) {
      showErrors(fields, Object.values(fields)[0]);
      return;
    }
    setErrors({});
    setError("");
    if (step < PROFILE_STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    const parsed = developerSchema.safeParse(onboardingProfile(draft));
    if (!parsed.success) {
      showErrors(
        issuesToErrors(
          parsed.error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path.map(String),
          })),
        ),
        "Check the highlighted details.",
      );
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const response = await api("/developers/me", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) {
        showErrors(issuesToErrors(response.issues), response.error);
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
  const Step = steps[step];
  return (
    <Card>
      <CardPanel className="space-y-6 p-5 sm:p-7">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{PROFILE_STEPS[step]}</span>
            <span>
              {step + 1} of {PROFILE_STEPS.length}
            </span>
          </div>
          <Progress
            aria-label="Profile setup"
            value={((step + 1) / PROFILE_STEPS.length) * 100}
          >
            <ProgressTrack className="bg-secondary">
              <ProgressIndicator className="bg-primary" />
            </ProgressTrack>
          </Progress>
        </div>
        <h2
          ref={heading}
          tabIndex={-1}
          className="text-2xl leading-tight outline-none"
        >
          {questions[step]}
        </h2>
        <Form
          ref={form}
          method="post"
          onSubmit={submit}
          errors={errors}
          className="space-y-6"
        >
          <fieldset disabled={pending}>
            <Step draft={draft} update={update} />
          </fieldset>
          {error && (
            <ErrorAlert
              title={step === 3 ? "Profile not saved" : "Check this step"}
              message={error}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > 0 ? (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setError("");
                  setErrors({});
                  setStep(step - 1);
                }}
              >
                <ArrowLeftIcon aria-hidden="true" />
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={pending}>
              {step === 3 ? "Save and continue" : "Continue"}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </div>
        </Form>
      </CardPanel>
    </Card>
  );
}
