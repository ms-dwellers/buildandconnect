/** Accept only same-site paths for post-sign-in redirects. */
export function safeNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
