"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { homeFor, useSession } from "@/lib/session";
import { ErrorAlert } from "./require-role";

export function AuthForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next: string | null;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError(null);
    const result = await api(`/auth/${mode}/email`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    const session = await refresh();
    router.push(
      session.status === "member" && session.role
        ? (next ?? homeFor(session.role))
        : "/role",
    );
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
          <Button type="submit" loading={pending} className="w-full">
            {signUp ? "Create account" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {signUp ? "Already have an account? " : "New here? "}
            <a
              href={signUp ? "/sign-in" : "/sign-up"}
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
