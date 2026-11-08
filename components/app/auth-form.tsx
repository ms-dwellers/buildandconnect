"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { afterAuthentication, withNext } from "@/lib/navigation";
import { ErrorAlert } from "./require-role";

export function AuthForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next: string | null;
}) {
  const router = useRouter();
  const { refresh, session, signingOut } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signUp = mode === "sign-up";
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (session.status === "member" && !busy.current && !signingOut)
      router.replace(afterAuthentication(session.role, next));
  }, [session, router, next, signingOut]);

  async function continueSession() {
    const current = await refresh();
    if (current.status !== "member") {
      setError(
        current.status === "unavailable"
          ? current.message
          : "Sign-in could not be confirmed. Check your connection and retry.",
      );
      return;
    }
    router.replace(afterAuthentication(current.role, next));
  }

  async function retryAccount() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await continueSession();
    } catch {
      setError(
        "Your account could not be loaded. Check your connection and retry.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || authenticated) return;
    busy.current = true;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError(null);
    try {
      const result = await api(`/auth/${mode}/email`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAuthenticated(true);
      await continueSession();
    } catch {
      setError(
        "Check your connection and try again. Your form has not been cleared.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <Card>
      <CardPanel className="p-6">
        {/* method="post" keeps credentials out of the URL if someone submits
            before hydration; the handler always prevents native submission. */}
        <Form method="post" onSubmit={submit} className="space-y-5">
          <fieldset disabled={pending || authenticated} className="space-y-5">
            {signUp && (
              <Field name="name">
                <FieldLabel>Name</FieldLabel>
                <Input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </Field>
            )}
            <Field name="email">
              <FieldLabel>Email</FieldLabel>
              <Input name="email" type="email" required autoComplete="email" />
            </Field>
            <Field name="password">
              <FieldLabel>Password</FieldLabel>
              <div className="relative w-full">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={signUp ? 12 : undefined}
                  autoComplete={signUp ? "new-password" : "current-password"}
                  className="w-full pe-12"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute end-1 top-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <EyeOffIcon aria-hidden="true" />
                  ) : (
                    <EyeIcon aria-hidden="true" />
                  )}
                </Button>
              </div>
              {signUp && (
                <FieldDescription>At least 12 characters.</FieldDescription>
              )}
            </Field>
          </fieldset>
          {session.status === "unavailable" && !authenticated && (
            <ErrorAlert
              title="Your account could not be checked"
              message={session.message}
              onRetry={() => void refresh()}
            />
          )}
          {error && (
            <ErrorAlert
              title={
                authenticated
                  ? "Unable to continue"
                  : signUp
                    ? "Account not created"
                    : "Unable to sign in"
              }
              message={error}
            />
          )}
          {authenticated && error && (
            <Button
              variant="outline"
              loading={pending}
              onClick={() => void retryAccount()}
            >
              Retry loading account
            </Button>
          )}
          <Button
            type="submit"
            loading={pending}
            disabled={
              !ready ||
              authenticated ||
              session.status === "loading" ||
              session.status === "unavailable"
            }
            className="w-full"
          >
            {signUp ? "Create account" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {signUp ? "Already have an account? " : "New here? "}
            <a
              href={withNext(signUp ? "/sign-in" : "/sign-up", next)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {signUp ? "Sign in" : "Create an account"}
            </a>
          </p>
        </Form>
      </CardPanel>
    </Card>
  );
}
