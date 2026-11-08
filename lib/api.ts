export type ApiIssue = { path: (string | number)[]; message: string };
export type SessionUser = { id: string; name: string; email?: string };
export type Role = "developer" | "company" | "recruiter" | "requester";

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; issues?: ApiIssue[] }
> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const text = await response.text();
  // Hono errors use `error`; proxied Better Auth errors use `message`.
  type Body = { error?: string; message?: string; issues?: ApiIssue[] } & T;
  let body: Body = {} as Body;
  if (text) {
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      return {
        ok: false,
        status: response.status,
        error: "Unexpected response from the server",
      };
    }
  }
  if (!response.ok)
    return {
      ok: false,
      status: response.status,
      error: body.error ?? body.message ?? "Request failed",
      issues: body.issues,
    };
  return { ok: true, data: body };
}

export function mapboxToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token ? token : null;
}
