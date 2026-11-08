/** Accept only same-site paths for post-sign-in redirects. */
export function safeNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (
    !next ||
    next.length > 2000 ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    /^\/%2f/i.test(next) ||
    /[\\\u0000-\u001f\u007f]|%(?:5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(next)
  )
    return null;
  try {
    const url = new URL(next, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      url.pathname === "/" ||
      /^\/(?:\/|%2f)/i.test(url.pathname) ||
      /^\/(?:sign-in|sign-up|role|onboarding)(?:\/|$)/.test(url.pathname)
    )
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function withNext(path: string, next: string | null | undefined) {
  const destination = safeNext(next ?? undefined);
  return destination
    ? `${path}${path.includes("?") ? "&" : "?"}next=${encodeURIComponent(destination)}`
    : path;
}

export function afterAuthentication(
  role: "developer" | "requester" | null,
  next: string | null,
) {
  if (role === "developer") return withNext("/onboarding", next);
  return role
    ? (safeNext(next ?? undefined) ?? "/dashboard")
    : withNext("/role", next);
}

export function afterRoleSelection(
  role: "developer" | "requester",
  next: string | null,
) {
  return role === "developer"
    ? withNext("/onboarding", safeNext(next ?? undefined) ?? "/career")
    : (safeNext(next ?? undefined) ?? "/projects/new");
}

export function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Dynamic route params can arrive percent-encoded (`a%3Ab`); decode them once. */
export function routeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
