"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  FlaskConicalIcon,
  LogOutIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { AppHeader } from "@/components/app/app-shell";
import { FieldMessage } from "@/components/forms/form-kit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildRequest,
  isRecord,
  qaSteps,
  requests,
  type RequestPreset,
} from "./requests.ts";
import { GitHubMark, GoogleMark } from "@/components/app/provider-marks";
import { socialSignInError } from "@/lib/auth-errors";
import type { AuthProviders, SocialProvider } from "@/lib/types";
import { DebugResponse } from "./response";
import { useDebugApi } from "./use-debug-api";

const pretty = (body: unknown) =>
  body === undefined ? "" : JSON.stringify(body, null, 2);

export function DebugConsole() {
  const api = useDebugApi();
  const [selected, setSelected] = useState(requests[0]);
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [developerId, setDeveloperId] = useState("");
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("developer");
  const [contextStatus, setContextStatus] = useState("");
  const [authError, setAuthError] = useState("");
  const [providers, setProviders] = useState<AuthProviders | null>(null);

  useEffect(() => {
    // A provider sign-in that failed returns here with ?error=<code>.
    const code = new URLSearchParams(window.location.search).get("error");
    const message = socialSignInError(code ?? undefined);
    if (message) setAuthError(message);
    const controller = new AbortController();
    void fetch("/api/auth-providers", {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) =>
        response.ok ? (response.json() as Promise<AuthProviders>) : null,
      )
      .then((data) => {
        if (data) setProviders(data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const filtered = requests.filter((request) =>
    `${request.title} ${request.path} ${request.group}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const groups = [...new Set(filtered.map((request) => request.group))];

  function select(request: RequestPreset) {
    api.clearError();
    setSelected(request);
    setBody(pretty(request.body));
    setQuery(request.query ? "limit=20" : "");
  }
  function useOpportunity(id: string) {
    setOpportunityId(id);
    setContextStatus("Opportunity ID added to the request context.");
  }
  function useDeveloper(id: string) {
    setDeveloperId(id);
    setContextStatus("Developer ID added to the request context.");
  }

  function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void api.run(async () => {
      setAuthError("");
      api.clearHistory();
      try {
        const signup = authMode === "sign-up";
        const result = await api.send(
          {
            path: `/api/auth/${signup ? "sign-up" : "sign-in"}/email`,
            method: "POST",
            body: JSON.stringify({
              email,
              password,
              ...(signup ? { name } : {}),
            }),
          },
          signup ? "Create account" : "Sign in",
          [password],
        );
        if (result.status === null || result.status >= 400) {
          const data = result.data;
          setAuthError(
            isRecord(data) && typeof data.message === "string"
              ? data.message
              : isRecord(data) && typeof data.error === "string"
                ? data.error
                : "Authentication failed. Inspect the response below.",
          );
        }
        if (signup && result.status === 200)
          await api.send(
            {
              path: "/api/me/role",
              method: "PUT",
              body: JSON.stringify({ role }),
            },
            "Set account role",
          );
        await api.refresh();
      } finally {
        setPassword("");
      }
    });
  }
  function continueWith(provider: SocialProvider) {
    void api.run(async () => {
      setAuthError("");
      api.clearHistory();
      const result = await api.send(
        {
          path: "/api/auth/sign-in/social",
          method: "POST",
          body: JSON.stringify({
            provider,
            callbackURL: "/debug",
            newUserCallbackURL: "/debug",
            errorCallbackURL: "/debug",
          }),
        },
        `Continue with ${provider === "google" ? "Google" : "GitHub"}`,
      );
      const url =
        isRecord(result.data) && typeof result.data.url === "string"
          ? result.data.url
          : null;
      if (result.status === 200 && url) window.location.assign(url);
      else
        setAuthError(
          "The provider did not return a sign-in link. Inspect the response below.",
        );
    });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void api.run(async () => {
      const call = buildRequest(
        selected,
        opportunityId,
        developerId,
        query,
        body,
      );
      const result = await api.send(call, selected.title);
      if (
        result.status !== null &&
        result.status < 400 &&
        isRecord(result.data)
      ) {
        if (
          selected.id === "opportunity-create" &&
          typeof result.data.id === "string"
        )
          useOpportunity(result.data.id);
        if (
          (selected.id === "profile-save" || selected.id === "profile-read") &&
          typeof result.data.id === "string"
        )
          useDeveloper(result.data.id);
      }
      if (selected.id === "role" || selected.id === "me") await api.refresh();
    });
  }

  return (
    <>
      <Button
        render={<a href="#debug-main" />}
        className="fixed start-4 top-4 z-50 -translate-y-24 focus-visible:translate-y-0"
      >
        Skip to console
      </Button>
      <div className="mx-auto max-w-[96rem] px-4 pb-12 sm:px-8">
        <AppHeader
          variant="tool"
          label="QA console"
          className="px-0 sm:px-0"
          actions={
            <Button render={<a href="/" />} variant="ghost">
              <ArrowLeftIcon aria-hidden="true" />
              Back to site
            </Button>
          }
        />
        <main
          id="debug-main"
          tabIndex={-1}
          className="space-y-6 pt-8 outline-none"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
                Backend playground
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Real API. Real data. Writes change the connected database; AI
                actions may incur charges.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  api.health === "up"
                    ? "success"
                    : api.health === "down"
                      ? "error"
                      : "outline"
                }
              >
                {api.health === "up"
                  ? "Worker online"
                  : api.health === "down"
                    ? "Worker unavailable"
                    : "Checking worker"}
              </Badge>
              <Button
                variant="outline"
                disabled={api.busy}
                onClick={() => void api.run(() => api.refresh())}
              >
                <RefreshCwIcon aria-hidden="true" />
                Refresh session
              </Button>
            </div>
          </div>

          {api.account.state === "unavailable" && (
            <Alert variant="error">
              <AlertDescription>
                Account API unavailable. Check the Convex deployment and its
                SITE_URL.{" "}
                <a
                  className="font-medium underline underline-offset-4"
                  href="#qa-setup"
                >
                  View setup steps
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
            <aside
              className="min-w-0 space-y-5"
              aria-label="Session and requests"
            >
              <Card>
                <CardHeader>
                  <CardTitle render={<h2 />}>Session</CardTitle>
                </CardHeader>
                <CardPanel className="space-y-4">
                  <p role="status" className="text-sm">
                    {api.account.state === "signed-in" ? (
                      <>
                        <span className="font-medium">{api.account.name}</span>{" "}
                        <Badge variant="success">
                          {api.account.role ?? "Role not set"}
                        </Badge>
                      </>
                    ) : api.account.state === "loading" ? (
                      "Checking session..."
                    ) : api.account.state === "unavailable" ? (
                      "Session unavailable"
                    ) : (
                      "Signed out"
                    )}
                  </p>
                  {api.account.state === "signed-in" ? (
                    <>
                      <p className="break-all font-mono text-xs leading-5 text-muted-foreground">
                        {api.account.id}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {api.account.role === "developer" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => useDeveloper(api.account.id!)}
                          >
                            Use my developer ID
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={api.busy}
                          onClick={() =>
                            void api.run(async () => {
                              api.clearHistory();
                              await api.send(
                                {
                                  path: "/api/auth/sign-out",
                                  method: "POST",
                                  body: "{}",
                                },
                                "Sign out",
                              );
                              await api.refresh();
                            })
                          }
                        >
                          <LogOutIcon aria-hidden="true" />
                          Sign out
                        </Button>
                      </div>
                      {!api.account.role && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            select(
                              requests.find(
                                (request) => request.id === "role",
                              )!,
                            )
                          }
                        >
                          Choose account role
                        </Button>
                      )}
                    </>
                  ) : (
                    <form onSubmit={authenticate} className="space-y-4">
                      {providers && (providers.google || providers.github) && (
                        <div
                          className="flex flex-wrap gap-2"
                          role="group"
                          aria-label="Sign in with a provider"
                        >
                          {providers.google && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={api.busy}
                              onClick={() => continueWith("google")}
                            >
                              <GoogleMark className="opacity-100" />
                              Continue with Google
                            </Button>
                          )}
                          {providers.github && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={api.busy}
                              onClick={() => continueWith("github")}
                            >
                              <GitHubMark className="opacity-100" />
                              Continue with GitHub
                            </Button>
                          )}
                        </div>
                      )}
                      <ToggleGroup
                        aria-label="Authentication mode"
                        size="sm"
                        value={[authMode]}
                        disabled={api.busy}
                        onValueChange={(next) => {
                          const mode = next[0];
                          if (mode !== "sign-in" && mode !== "sign-up") return;
                          setAuthMode(mode);
                          setPassword("");
                          setAuthError("");
                        }}
                      >
                        <ToggleGroupItem value="sign-in">
                          Sign in
                        </ToggleGroupItem>
                        <ToggleGroupItem value="sign-up">
                          Create account
                        </ToggleGroupItem>
                      </ToggleGroup>
                      {authMode === "sign-up" && (
                        <div className="space-y-2">
                          <Label htmlFor="qa-name">Name</Label>
                          <Input
                            id="qa-name"
                            name="name"
                            autoComplete="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            maxLength={100}
                            disabled={api.busy}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="qa-email">Email</Label>
                        <Input
                          id="qa-email"
                          name="email"
                          type="email"
                          autoComplete="username"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          disabled={api.busy}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qa-password">Password</Label>
                        <Input
                          id="qa-password"
                          name="password"
                          type="password"
                          autoComplete={
                            authMode === "sign-up"
                              ? "new-password"
                              : "current-password"
                          }
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          minLength={authMode === "sign-up" ? 12 : undefined}
                          disabled={api.busy}
                          aria-describedby={
                            authMode === "sign-up"
                              ? "qa-password-hint"
                              : undefined
                          }
                        />
                        {authMode === "sign-up" && (
                          <p
                            id="qa-password-hint"
                            className="text-xs text-muted-foreground"
                          >
                            At least 12 characters.
                          </p>
                        )}
                      </div>
                      {authMode === "sign-up" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium" id="qa-role-label">
                            Account role (set once)
                          </p>
                          <ToggleGroup
                            aria-labelledby="qa-role-label"
                            size="sm"
                            value={[role]}
                            disabled={api.busy}
                            onValueChange={(next) => {
                              if (typeof next[0] === "string") setRole(next[0]);
                            }}
                          >
                            {["developer", "requester"].map((item) => (
                              <ToggleGroupItem key={item} value={item}>
                                {item}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        </div>
                      )}
                      <FieldMessage>{authError}</FieldMessage>
                      <Button
                        type="submit"
                        className="w-full"
                        loading={api.busy}
                      >
                        {authMode === "sign-up" ? "Create account" : "Sign in"}
                      </Button>
                    </form>
                  )}
                </CardPanel>
              </Card>

              <Card>
                <CardHeader className="gap-4">
                  <CardTitle render={<h2 />}>
                    Requests{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {requests.length}
                    </span>
                  </CardTitle>
                  <div className="space-y-2">
                    <Label htmlFor="request-search">
                      <SearchIcon aria-hidden="true" className="size-4" />
                      Find an endpoint
                    </Label>
                    <Input
                      id="request-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardPanel>
                  <nav
                    aria-label="API requests"
                    className="max-h-[30rem] space-y-5 overflow-y-auto p-1"
                  >
                    {groups.map((group) => (
                      <div key={group} className="space-y-2">
                        <h3 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {group}
                        </h3>
                        {filtered
                          .filter((request) => request.group === group)
                          .map((request) => (
                            <Button
                              key={request.id}
                              variant={
                                selected.id === request.id
                                  ? "secondary"
                                  : "ghost"
                              }
                              className="h-auto min-h-10 w-full justify-start gap-2 px-2 py-2 text-start whitespace-normal"
                              aria-pressed={selected.id === request.id}
                              disabled={api.busy}
                              onClick={() => select(request)}
                            >
                              <span className="w-11 shrink-0 font-mono text-[.65rem] font-semibold">
                                {request.method}
                              </span>
                              <span className="text-sm">{request.title}</span>
                            </Button>
                          ))}
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <p className="px-2 text-sm text-muted-foreground">
                        No endpoints found. Clear the search to see all
                        requests.
                      </p>
                    )}
                  </nav>
                </CardPanel>
              </Card>
            </aside>

            <div className="min-w-0 space-y-5">
              <Card render={<section aria-labelledby="request-heading" />}>
                <CardHeader className="gap-3 border-b">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle render={<h2 id="request-heading" />}>
                      {selected.title}
                    </CardTitle>
                    <Badge variant="outline">{selected.caller}</Badge>
                  </div>
                  <p className="break-all font-mono text-xs leading-6 text-muted-foreground">
                    <span className="font-semibold text-primary">
                      {selected.method}
                    </span>{" "}
                    {selected.path}
                  </p>
                </CardHeader>
                <CardPanel className="pt-5">
                  <form onSubmit={submit} className="space-y-5">
                    <fieldset
                      disabled={api.busy}
                      className="grid min-w-0 gap-4 sm:grid-cols-2"
                    >
                      <legend className="mb-3 text-xs font-medium text-muted-foreground">
                        Request context
                      </legend>
                      <div className="space-y-2">
                        <Label htmlFor="opportunity-id">
                          Opportunity, request or draft ID
                        </Label>
                        <Input
                          id="opportunity-id"
                          value={opportunityId}
                          onChange={(event) =>
                            setOpportunityId(event.target.value)
                          }
                          placeholder="Returned when an opportunity is created"
                          className="font-mono text-base sm:text-xs"
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="developer-id">Developer ID</Label>
                        <Input
                          id="developer-id"
                          value={developerId}
                          onChange={(event) =>
                            setDeveloperId(event.target.value)
                          }
                          placeholder="Used for requester interest"
                          className="font-mono text-base sm:text-xs"
                          maxLength={100}
                        />
                      </div>
                    </fieldset>
                    <p role="status" className="text-xs text-muted-foreground">
                      {contextStatus}
                    </p>
                    {selected.query && (
                      <div className="space-y-2">
                        <Label htmlFor="request-query">Query parameters</Label>
                        <Input
                          id="request-query"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          disabled={api.busy}
                          aria-describedby="query-hint"
                          className="font-mono"
                        />
                        <p
                          id="query-hint"
                          className="text-xs text-muted-foreground"
                        >
                          Supported: {selected.query.join(", ")}. Example:
                          limit=20.
                        </p>
                      </div>
                    )}
                    {selected.method !== "GET" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="request-body">JSON body</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={api.busy}
                            onClick={() => setBody(pretty(selected.body))}
                          >
                            Reset sample
                          </Button>
                        </div>
                        <Textarea
                          id="request-body"
                          value={body}
                          onChange={(event) => setBody(event.target.value)}
                          disabled={api.busy}
                          spellCheck={false}
                          rows={12}
                          className="font-mono text-base sm:text-xs [&_textarea]:min-h-64 [&_textarea]:resize-y [&_textarea]:[field-sizing:fixed]"
                          aria-invalid={
                            api.error.includes("valid JSON") || undefined
                          }
                          aria-describedby={
                            api.error ? "request-error" : undefined
                          }
                        />
                      </div>
                    )}
                    {selected.note && (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {selected.note}
                      </p>
                    )}
                    {selected.ai && (
                      <p className="rounded-lg bg-secondary/60 p-3 text-xs leading-5">
                        <strong>Workers AI required.</strong> Remote AI must be
                        configured. Without it, expect 503 and no saved data.
                      </p>
                    )}
                    <FieldMessage id="request-error">{api.error}</FieldMessage>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button type="submit" loading={api.busy}>
                        <PlayIcon aria-hidden="true" />
                        Send request
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Same-origin session cookies. No auth bypass.
                      </span>
                    </div>
                  </form>
                </CardPanel>
              </Card>

              <DebugResponse
                key={api.result?.id ?? "empty"}
                result={api.result}
                onOpportunity={useOpportunity}
                onDeveloper={useDeveloper}
              />

              <Card render={<section aria-labelledby="history-heading" />}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle render={<h2 id="history-heading" />}>
                      Recent requests
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={api.clearHistory}
                      disabled={api.busy || !api.history.length}
                    >
                      <Trash2Icon aria-hidden="true" />
                      Clear history
                    </Button>
                  </div>
                </CardHeader>
                <CardPanel className="space-y-2">
                  {api.history.length ? (
                    api.history.map((entry) => (
                      <Button
                        key={entry.id}
                        variant={
                          api.result?.id === entry.id ? "secondary" : "ghost"
                        }
                        className="h-auto min-h-10 w-full justify-start gap-3 py-2 text-start whitespace-normal"
                        onClick={() => api.setResult(entry)}
                      >
                        <span className="w-9 shrink-0 font-mono text-xs">
                          {entry.status ?? "ERR"}
                        </span>
                        <span className="min-w-0 flex-1 break-all text-xs">
                          {entry.method} {entry.path}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {entry.duration} ms
                        </span>
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No requests yet.
                    </p>
                  )}
                  <p className="pt-2 text-xs leading-5 text-muted-foreground">
                    Last 10 responses, held in this page only. Passwords and
                    tokens are redacted; other account and project data may be
                    visible.
                  </p>
                </CardPanel>
              </Card>
            </div>
          </div>

          <Card render={<section aria-labelledby="qa-heading" />}>
            <CardHeader>
              <CardTitle render={<h2 id="qa-heading" />}>
                <span className="flex items-center gap-2">
                  <FlaskConicalIcon aria-hidden="true" className="size-5" />
                  QA walkthrough
                </span>
              </CardTitle>
            </CardHeader>
            <CardPanel className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {qaSteps.map(([title, description], index) => (
                <div key={title} className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    <span className="me-2 font-mono text-primary">
                      0{index + 1}
                    </span>
                    {title}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
              <div id="qa-setup" className="space-y-2">
                <h3 className="text-sm font-semibold">Local setup</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Run{" "}
                  <code className="font-mono text-xs">
                    bun run setup:backend
                  </code>{" "}
                  after selecting a Convex development deployment, then keep{" "}
                  <code className="font-mono text-xs">bun run dev:backend</code>{" "}
                  running. Set SITE_URL to this page&apos;s origin. Set{" "}
                  WORKERS_AI_ENABLED=true and the provider credentials in Convex
                  for real AI calls. See{" "}
                  <code className="font-mono text-xs">docs/backend.md</code>.
                </p>
              </div>
            </CardPanel>
          </Card>
        </main>
      </div>
    </>
  );
}
