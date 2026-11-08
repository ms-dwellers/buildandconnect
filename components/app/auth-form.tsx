"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const { refresh, session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const signUp = mode === "sign-up";
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (session.status === "member" && !busy.current)
      router.replace(afterAuthentication(session.role, next));
  }, [session, router, next]);

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
          {signUp && (
            <Field name="name">
              <FieldLabel>Name</FieldLabel>
              <Input name="name" required maxLength={100} autoComplete="name" />
            </Field>
          )}
          <Field name="email">
            <FieldLabel>Email</FieldLabel>
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field name="password">
            <FieldLabel>Password</FieldLabel>
            <Input
              name="password"
              type="password"
              required
              minLength={signUp ? 12 : undefined}
              autoComplete={signUp ? "new-password" : "current-password"}
            />
            {signUp && (
              <FieldDescription>At least 12 characters.</FieldDescription>
            )}
          </Field>
          {error && (
            <ErrorAlert
              title={signUp ? "Account not created" : "Unable to sign in"}
              message={error}
            />
          )}
          {authenticated && error && (
            <Button variant="outline" onClick={() => void continueSession()}>
              Retry loading account
            </Button>
          )}
          <Button
            type="submit"
            loading={pending}
            disabled={!ready || authenticated}
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
