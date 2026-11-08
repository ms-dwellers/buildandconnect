import type {
  DeveloperProfile,
  OpportunityInput,
} from "../../backend/schemas.ts";

export const sampleProfile: DeveloperProfile = {
  bio: "I build community websites with React and want to grow through practical projects.",
  city: "Toronto",
  skills: [{ name: "react", level: 3 }],
  projects: [
    {
      title: "Garden site",
      description: "A community garden website with accessible forms.",
      technologies: ["react"],
    },
  ],
  interests: ["community", "sustainability"],
  wantsToLearn: ["typescript", "accessibility"],
  experienceLevel: 1,
  collaboration: "async",
  weeklyHours: 10,
  acceptsVolunteer: true,
  available: true,
  discoverable: true,
};
export const sampleOpportunity: OpportunityInput = {
  title: "Community garden website",
  description:
    "Build an accessible React website for a community garden. TypeScript preferred. A senior volunteer provides weekly mentorship.",
  city: "Toronto",
  remote: false,
  kind: "volunteer",
  essentialTechnologies: ["react"],
  minimumWeeklyHours: 5,
  collaboration: "async",
  interests: ["community", "sustainability"],
};

export type RequestPreset = {
  id: string;
  group: string;
  title: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
  caller: string;
  note?: string;
  body?: unknown;
  query?: readonly string[];
  ai?: boolean;
};
const browse = ["limit", "after"];
export const requests: RequestPreset[] = [
  {
    id: "health",
    group: "System",
    title: "Check health",
    method: "GET",
    path: "/api/health",
    caller: "Public",
  },
  {
    id: "me",
    group: "Account",
    title: "Read current account",
    method: "GET",
    path: "/api/me",
    caller: "Signed in",
  },
  {
    id: "session",
    group: "Account",
    title: "Inspect session",
    method: "GET",
    path: "/api/auth/get-session",
    caller: "Public",
    note: "Session tokens are redacted from the response.",
  },
  {
    id: "providers",
    group: "Account",
    title: "List sign-in providers",
    method: "GET",
    path: "/api/auth-providers",
    caller: "Public",
    note: "Booleans only; provider credentials never leave Convex.",
  },
  {
    id: "role",
    group: "Account",
    title: "Set account role",
    method: "PUT",
    path: "/api/me/role",
    caller: "Signed in",
    body: { role: "developer" },
    note: "Roles are set once. A different role returns 409.",
  },
  {
    id: "profile-save",
    group: "Developers",
    title: "Save developer profile",
    method: "PUT",
    path: "/api/developers/me",
    caller: "Developer",
    body: sampleProfile,
    ai: true,
    note: "Replaces the entire profile after embedding succeeds.",
  },
  {
    id: "profile-read",
    group: "Developers",
    title: "Read own profile",
    method: "GET",
    path: "/api/developers/me",
    caller: "Developer",
  },
  {
    id: "profile-visibility",
    group: "Developers",
    title: "Update availability",
    method: "PATCH",
    path: "/api/developers/me",
    caller: "Developer",
    body: { available: true, discoverable: true },
    note: "No AI call. Set discoverable to false to test opting out.",
  },
  {
    id: "developers",
    group: "Developers",
    title: "Browse developers",
    method: "GET",
    path: "/api/developers",
    caller: "Company or recruiter",
    query: browse,
  },
  {
    id: "opportunity-create",
    group: "Opportunities",
    title: "Post opportunity",
    method: "POST",
    path: "/api/opportunities",
    caller: "Company",
    body: sampleOpportunity,
    ai: true,
  },
  {
    id: "opportunities",
    group: "Opportunities",
    title: "Browse opportunities",
    method: "GET",
    path: "/api/opportunities",
    caller: "Signed in",
    query: [...browse, "city", "kind"],
  },
  {
    id: "opportunity-read",
    group: "Opportunities",
    title: "Read opportunity",
    method: "GET",
    path: "/api/opportunities/:id",
    caller: "Signed in",
  },
  {
    id: "opportunity-status",
    group: "Opportunities",
    title: "Open or close opportunity",
    method: "PATCH",
    path: "/api/opportunities/:id",
    caller: "Opportunity owner",
    body: { status: "closed" },
  },
  {
    id: "matches",
    group: "Matching",
    title: "Rank developers",
    method: "GET",
    path: "/api/opportunities/:id/matches",
    caller: "Opportunity owner",
    query: ["limit"],
  },
  {
    id: "match",
    group: "Matching",
    title: "Check own match",
    method: "GET",
    path: "/api/opportunities/:id/match",
    caller: "Developer",
  },
  {
    id: "interest-developer",
    group: "Networking",
    title: "Express developer interest",
    method: "PUT",
    path: "/api/opportunities/:id/interest",
    caller: "Developer",
    body: { interested: true },
    note: "Set interested to false to withdraw.",
  },
  {
    id: "interest-company",
    group: "Networking",
    title: "Express company interest",
    method: "PUT",
    path: "/api/opportunities/:id/interest",
    caller: "Opportunity owner",
    body: { developerId: "{{developerId}}", interested: true },
    note: "Uses the developer ID below. Set interested to false to withdraw.",
  },
  {
    id: "interests",
    group: "Networking",
    title: "Read pending interests",
    method: "GET",
    path: "/api/interests",
    caller: "Company or developer",
    query: browse,
  },
  {
    id: "connections",
    group: "Networking",
    title: "Read mutual connections",
    method: "GET",
    path: "/api/connections",
    caller: "Company or developer",
    query: browse,
  },
];

export function buildRequest(
  preset: RequestPreset,
  opportunityId: string,
  developerId: string,
  query: string,
  body: string,
) {
  let path = preset.path;
  if (path.includes(":id")) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(opportunityId.trim()))
      throw new Error("Enter a valid opportunity ID.");
    path = path.replace(":id", encodeURIComponent(opportunityId.trim()));
  }
  if (preset.query && query.trim()) {
    const params = new URLSearchParams(query.replace(/^\?/, ""));
    for (const key of params.keys()) {
      if (!preset.query.includes(key))
        throw new Error(`Supported query fields: ${preset.query.join(", ")}.`);
    }
    path += `?${params.toString()}`;
  }
  let parsed: unknown;
  if (preset.method !== "GET") {
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Enter valid JSON in the request body.");
    }
    if (isRecord(parsed) && parsed.developerId === "{{developerId}}") {
      if (!developerId.trim())
        throw new Error(
          "Enter a developer ID or replace the placeholder in the body.",
        );
      parsed = { ...parsed, developerId: developerId.trim() };
    }
  }
  return {
    path,
    method: preset.method,
    body: parsed === undefined ? undefined : JSON.stringify(parsed),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const sensitiveKey = /password|token|secret|authorization|cookie|credential/i;
export function redact(
  value: unknown,
  secrets: readonly string[] = [],
): unknown {
  if (typeof value === "string")
    return secrets
      .filter(Boolean)
      .reduce((text, secret) => text.replaceAll(secret, "[redacted]"), value);
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets));
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? "[redacted]" : redact(item, secrets),
      ]),
    );
  return value;
}

export const qaSteps = [
  [
    "Create test accounts",
    "Use separate browser profiles or private windows for company and developer sessions. Roles cannot be changed after selection.",
  ],
  [
    "Save a developer profile",
    "Use the sample profile as the developer, then post the sample opportunity as the company. Both actions need Workers AI.",
  ],
  [
    "Rank and inspect",
    "Copy the opportunity ID into the request context. Rank as its owner; try another company or recruiter and expect 403.",
  ],
  [
    "Connect through a project",
    "Express interest on each side using the same opportunity and developer IDs. Check pending interests, mutual connections, then withdraw.",
  ],
  [
    "Exercise failure states",
    "Sign out and expect 401 on protected routes. Submit an incomplete profile for 400. Hide the developer and confirm they disappear from ranking and discovery.",
  ],
] as const;
