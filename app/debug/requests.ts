import type {
  DeveloperProfile,
  OpportunityInput,
  RequestInput,
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

export const sampleRequest: RequestInput = {
  title: "Fix our garden sign-up form",
  description:
    "Our community garden's volunteer sign-up form breaks on phones. We need someone to rebuild it as a simple, accessible page.",
  place: "Bridgeland community hall",
  latitude: 51.0535,
  longitude: -114.0407,
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
    id: "map",
    group: "System",
    title: "Public map feed",
    method: "GET",
    path: "/api/map",
    caller: "Public",
    note: "Pin precision depends on the viewer; developers see exact request places.",
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
    id: "location",
    group: "Developers",
    title: "Set area and radius",
    method: "PATCH",
    path: "/api/developers/me/location",
    caller: "Developer",
    body: { latitude: 51.0447, longitude: -114.0719, radiusKm: 10 },
    note: "No AI call. Nearby requests use this pin and radius.",
  },
  {
    id: "preferences",
    group: "Developers",
    title: "Update work preferences",
    method: "PATCH",
    path: "/api/developers/me/preferences",
    caller: "Developer",
    body: {
      professionalExperienceYears: 1,
      compensationPreference: null,
      workArrangementPreference: { preferred: "flexible", required: false },
    },
    note: "No AI call.",
  },
  {
    id: "career-target",
    group: "Developers",
    title: "Read career target",
    method: "GET",
    path: "/api/developers/me/career-target",
    caller: "Developer",
    note: "Private to the developer; null until a target job is saved.",
  },
  {
    id: "career-projects",
    group: "Developers",
    title: "Career project recommendations",
    method: "GET",
    path: "/api/developers/me/career-projects",
    caller: "Developer",
    query: ["limit"],
  },
  {
    id: "developer-read",
    group: "Developers",
    title: "Read a developer",
    method: "GET",
    path: "/api/developers/:developerId",
    caller: "Requester",
    note: "Uses the developer ID below. Only consenting, discoverable profiles.",
  },
  {
    id: "developers",
    group: "Developers",
    title: "Browse developers",
    method: "GET",
    path: "/api/developers",
    caller: "Requester",
    query: browse,
  },
  {
    id: "opportunity-create",
    group: "Opportunities",
    title: "Post opportunity",
    method: "POST",
    path: "/api/opportunities",
    caller: "Requester",
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
    id: "opportunities-mine",
    group: "Opportunities",
    title: "Browse own opportunities",
    method: "GET",
    path: "/api/opportunities/mine",
    caller: "Requester",
    query: browse,
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
    id: "opportunity-interests",
    group: "Matching",
    title: "List interest on an opportunity",
    method: "GET",
    path: "/api/opportunities/:id/interests",
    caller: "Opportunity owner",
    query: browse,
  },
  {
    id: "request-match",
    group: "Matching",
    title: "Check own fit for a request",
    method: "GET",
    path: "/api/requests/:id/match",
    caller: "Developer",
    note: "Uses the ID below as the request ID.",
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
    id: "interest-requester",
    group: "Networking",
    title: "Express requester interest",
    method: "PUT",
    path: "/api/opportunities/:id/interest",
    caller: "Opportunity owner",
    body: { developerId: "{{developerId}}", interested: true },
    note: "Uses the developer ID below. Set interested to false to withdraw.",
  },
  {
    id: "request-create",
    group: "Requests",
    title: "Post community request",
    method: "POST",
    path: "/api/requests",
    caller: "Requester",
    body: sampleRequest,
    ai: true,
  },
  {
    id: "requests",
    group: "Requests",
    title: "Browse own requests",
    method: "GET",
    path: "/api/requests",
    caller: "Requester",
    query: browse,
  },
  {
    id: "requests-nearby",
    group: "Requests",
    title: "Nearby open requests",
    method: "GET",
    path: "/api/requests/nearby",
    caller: "Developer",
    query: ["limit"],
    note: "Needs a saved area and radius.",
  },
  {
    id: "requests-claimed",
    group: "Requests",
    title: "Requests I accepted",
    method: "GET",
    path: "/api/requests/claimed",
    caller: "Developer",
    query: browse,
  },
  {
    id: "request-read",
    group: "Requests",
    title: "Read request",
    method: "GET",
    path: "/api/requests/:id",
    caller: "Requester owner, or developer for open requests",
    note: "Uses the ID below as the request ID.",
  },
  {
    id: "request-status",
    group: "Requests",
    title: "Close request",
    method: "PATCH",
    path: "/api/requests/:id",
    caller: "Requester owner",
    body: { status: "closed" },
  },
  {
    id: "request-accept",
    group: "Requests",
    title: "Accept request",
    method: "POST",
    path: "/api/requests/:id/accept",
    caller: "Developer",
    note: "Exclusive claim while the request is open; retry-safe for the same developer.",
  },
  {
    id: "request-release",
    group: "Requests",
    title: "Release request",
    method: "POST",
    path: "/api/requests/:id/release",
    caller: "Claimant or requester",
  },
  {
    id: "project-drafts",
    group: "Requests",
    title: "List project drafts",
    method: "GET",
    path: "/api/project-drafts",
    caller: "Requester",
  },
  {
    id: "draft-publish",
    group: "Requests",
    title: "Publish a project draft",
    method: "POST",
    path: "/api/project-drafts/:id/publish",
    caller: "Requester",
    body: {},
    note: "Uses the ID below as the draft ID. Publishing posts the opportunity.",
  },
  {
    id: "hiring-status",
    group: "Hiring",
    title: "Check AI providers",
    method: "GET",
    path: "/api/hiring/status",
    caller: "Requester",
    note: "Booleans only; provider keys never leave Convex.",
  },
  {
    id: "interests",
    group: "Networking",
    title: "Read pending interests",
    method: "GET",
    path: "/api/interests",
    caller: "Requester or developer",
    query: browse,
  },
  {
    id: "connections",
    group: "Networking",
    title: "Read mutual connections",
    method: "GET",
    path: "/api/connections",
    caller: "Requester or developer",
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
  if (path.includes(":developerId")) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(developerId.trim()))
      throw new Error("Enter a valid developer ID.");
    path = path.replace(":developerId", encodeURIComponent(developerId.trim()));
  }
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
    "Use separate browser profiles or private windows for requester and developer sessions. Roles cannot be changed after selection.",
  ],
  [
    "Save a developer profile",
    "Use the sample profile as the developer, then post the sample opportunity as the requester. Both actions need Workers AI.",
  ],
  [
    "Rank and inspect",
    "Copy the opportunity ID into the request context. Rank as its owner; try another requester and expect 403.",
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
