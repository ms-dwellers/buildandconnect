const validationOnly = new Set([
  "$schema",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
]);

/** Keep provider schemas small; callers enforce every constraint with Zod. */
export function openRouterSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const compact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(compact);
    if (value && typeof value === "object")
      return openRouterSchema(value as Record<string, unknown>);
    return value;
  };
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => !validationOnly.has(key))
      .map(([key, value]) => [
        key,
        key === "properties" || key === "$defs"
          ? Object.fromEntries(
              Object.entries(value as Record<string, unknown>).map(
                ([name, property]) => [name, compact(property)],
              ),
            )
          : compact(value),
      ]),
  );
}
