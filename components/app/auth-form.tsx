"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { homeFor, useSession } from "@/lib/session";
import type { AuthProviders, SocialProvider } from "@/lib/types";
import { GitHubMark, GoogleMark } from "./provider-marks";
import { ErrorAlert } from "./require-role";

const PROVIDERS: { id: SocialProvider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

type Failure = { title: string; message: string };

export function AuthForm({
  mode,
  next,
  initialError = null,
}: {
  mode: "sign-in" | "sign-up";
  next: string | null;
  /** Explains why a provider sign-in sent the person back here. */
  initialError?: string | null;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [error, setError] = useState<Failure | null>(
    initialError
      ? { title: "Sign-in did not complete", message: initialError }
      : null,
  );
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState<SocialProvider | null>(null);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const signUp = mode === "sign-up";
  const busy = pending || redirecting !== null;
  const available = PROVIDERS.filter(({ id }) => providers?.[id]);
  const otherPage = signUp ? "/sign-in" : "/sign-up";
  const roleHref = next ? `/role?next=${encodeURIComponent(next)}` : "/role";
  const otherHref = next
    ? `${otherPage}?next=${encodeURIComponent(next)}`
    : otherPage;

  useEffect(() => {
    let cancelled = false;
    void api<AuthProviders>("/auth-providers").then((result) => {
      if (!cancelled && result.ok) setProviders(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError(null);
    const result = await api(`/auth/${mode}/email`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!result.ok) {
      setPending(false);
      setError({
        title: signUp ? "Account not created" : "Unable to sign in",
        message: result.error,
      });
      return;
    }
    const session = await refresh();
    router.push(
      session.status === "member" && session.role
        ? (next ?? homeFor(session.role))
        : roleHref,
    );
  }

  // Better Auth answers with the authorization URL. The browser leaves for the
  // provider and comes back through the same-origin callback route.
  async function continueWith(provider: SocialProvider) {
    if (busy) return;
    setRedirecting(provider);
    setError(null);
    const result = await api<{ url?: string }>("/auth/sign-in/social", {
      method: "POST",
      body: JSON.stringify({
        provider,
        callbackURL: next ?? "/dashboard",
        newUserCallbackURL: roleHref,
        errorCallbackURL: signUp ? "/sign-up" : "/sign-in",
      }),
    });
    if (!result.ok || !result.data.url) {
      setRedirecting(null);
      setError({
        title: "Sign-in did not complete",
        message: result.ok
          ? "The sign-in provider did not return a link. Try again."
          : result.error,
      });
      return;
    }
    window.location.assign(result.data.url);
  }

  return (
    <Card>
      <CardPanel className="space-y-5 p-6">
        {error && <ErrorAlert title={error.title} message={error.message} />}
        {available.length > 0 && (
          <>
            <div className="grid gap-3">
              {available.map(({ id, label }) => (
                <Button
                  key={id}
                  variant="outline"
                  className="w-full"
                  loading={redirecting === id}
                  disabled={busy && redirecting !== id}
                  onClick={() => void continueWith(id)}
                >
                  {id === "google" ? (
                    <GoogleMark className="opacity-100" />
                  ) : (
                    <GitHubMark className="opacity-100" />
                  )}
                  Continue with {label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">
                or use your email
              </span>
              <Separator className="flex-1" />
            </div>
          </>
        )}
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
          <Button
            type="submit"
            loading={pending}
            disabled={redirecting !== null}
            className="w-full"
          >
            {signUp ? "Create account" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {signUp ? "Already have an account? " : "New here? "}
            <a
              href={otherHref}
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
