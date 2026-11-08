import {
  normalizeSkill,
  type Developer,
  type LocalRequest,
  type Opportunity,
} from "./schemas.ts";
import { skillEvidenceBoost } from "./skill-evidence.ts";

export const MATCH_VERSION = "growth-v2-evidence";
export const WEIGHTS = {
  technicalReadiness: 0.3,
  growthPotential: 0.3,
  developerInterest: 0.2,
  collaborationCompatibility: 0.1,
  opportunityExposure: 0.1,
} as const;
export const EARTH_RADIUS_KM = 6371;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const percentage = (value: number) => Math.round(clamp(value) * 1000) / 10;
const overlap = (wanted: string[], actual: Set<string>) =>
  wanted.length
    ? wanted.filter((item) => actual.has(item)).length / wanted.length
    : 0;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
// One-way, partial credit for broad capabilities. This never claims an exact
// technology match or manufactures confirmed skill evidence.
const RELATED_SKILLS: Record<string, string[]> = {
  frontend: [
    "react",
    "vue",
    "angular",
    "svelte",
    "javascript",
    "typescript",
    "html",
    "css",
  ],
  backend: ["nodejs", "django", "flask", "rails", "asp.net", "spring"],
  databases: ["sql", "postgres", "mysql", "sqlite", "mongodb"],
  "version control": ["git"],
};

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const chord =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export function boundingBox(
  latitude: number,
  longitude: number,
  radiusKm: number,
) {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const lngDenominator = Math.cos(toRadians(latitude)) * EARTH_RADIUS_KM;
  const lngDelta =
    lngDenominator === 0 ? 180 : (radiusKm / lngDenominator) * (180 / Math.PI);
  return {
    minLat: Math.max(-90, latitude - latDelta),
    maxLat: Math.min(90, latitude + latDelta),
    minLng: Math.max(-180, longitude - lngDelta),
    maxLng: Math.min(180, longitude + lngDelta),
  };
}

/** Local requests share growth scoring; distance and unpaid work are separate gates. */
export function asMatchOpportunity(request: LocalRequest): Opportunity {
  return {
    id: request.id,
    ownerId: request.ownerId,
    title: request.title,
    description: request.description,
    city: request.place,
    remote: true,
    kind: "volunteer",
    essentialTechnologies: [],
    minimumWeeklyHours: 1,
    collaboration: "flexible",
    interests: [],
    status: request.status === "open" ? "open" : "closed",
    analysis: request.analysis,
    embedding: request.embedding,
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let aSquared = 0;
  let bSquared = 0;
  for (let index = 0; index < a.length; index++) {
    if (!Number.isFinite(a[index]) || !Number.isFinite(b[index])) return 0;
    dot += a[index] * b[index];
    aSquared += a[index] ** 2;
    bSquared += b[index] ** 2;
  }
  return aSquared && bSquared ? clamp(dot / Math.sqrt(aSquared * bSquared)) : 0;
}

export function eligibility(
  opportunity: Opportunity,
  developer: Developer,
  mode: "discovery" | "direct" = "discovery",
): string[] {
  const reasons: string[] = [];
  if (!developer.discoverable)
    reasons.push("Make your profile visible before sharing interest");
  if (mode === "discovery" && !developer.available)
    reasons.push("Not available for discovery");
  if (
    mode === "discovery" &&
    opportunity.kind === "volunteer" &&
    !developer.acceptsVolunteer
  )
    reasons.push("Paid opportunities only");
  return reasons;
}

export function matchConsiderations(
  opportunity: Opportunity,
  developer: Developer,
): string[] {
  const considerations: string[] = [];
  const skills = new Set(
    developer.skills.map((skill) => normalizeSkill(skill.name)),
  );
  for (const project of developer.projects)
    for (const skill of project.technologies) skills.add(normalizeSkill(skill));
  for (const backing of developer.skillEvidence ?? []) skills.add(backing.name);
  if (
    !opportunity.remote &&
    developer.city.trim().toLowerCase() !==
      opportunity.city.trim().toLowerCase()
  )
    considerations.push(
      `This project is in ${opportunity.city}; discuss travel or remote work.`,
    );
  if (developer.weeklyHours < opportunity.minimumWeeklyHours)
    considerations.push(
      `You offer ${developer.weeklyHours} hours/week; the requester asks for ${opportunity.minimumWeeklyHours}. Agree on a smaller scope or timing.`,
    );
  if (opportunity.kind === "volunteer" && !developer.acceptsVolunteer)
    considerations.push(
      "This is unpaid volunteer work, outside your usual paid-work preference.",
    );
  for (const skill of opportunity.essentialTechnologies) {
    if (!skills.has(normalizeSkill(skill)))
      considerations.push(
        `The requester asks for ${skill}; discuss your transferable skills and support needs.`,
      );
  }
  return considerations;
}

export function scoreMatch(
  opportunity: Opportunity,
  developer: Developer,
  mode: "discovery" | "direct" = "discovery",
) {
  if (
    opportunity.status !== "open" ||
    eligibility(opportunity, developer, mode).length
  )
    return null;
  const analysis = opportunity.analysis;
  const technologies = [
    ...new Set(
      [
        ...analysis.requiredTechnologies,
        ...analysis.preferredTechnologies,
        ...opportunity.essentialTechnologies,
        ...analysis.requiredSkills,
        ...(analysis.activities ?? []).flatMap((activity) => activity.skills),
      ].map(normalizeSkill),
    ),
  ];
  const skills = new Map(
    developer.skills.map((skill) => [normalizeSkill(skill.name), skill.level]),
  );
  for (const project of developer.projects) {
    for (const skill of project.technologies.map(normalizeSkill)) {
      if (!skills.has(skill)) skills.set(skill, 1);
    }
  }
  for (const backing of developer.skillEvidence ?? []) {
    const name = normalizeSkill(backing.name);
    if (!skills.has(name)) skills.set(name, 1);
  }
  const existingRelevantSkills = technologies.filter((skill) =>
    skills.has(skill),
  );
  const required = [
    ...new Set(
      [
        ...analysis.requiredTechnologies,
        ...opportunity.essentialTechnologies,
        ...analysis.requiredSkills,
      ].map(normalizeSkill),
    ),
  ];
  const readinessSkills = required.length ? required : technologies;
  const proficiencyFor = (skill: string) =>
    skills.get(skill) ??
    Math.max(
      0,
      ...(RELATED_SKILLS[skill] ?? []).map(
        (related) => (skills.get(related) ?? 0) * 0.6,
      ),
    );
  const transferableSkills = readinessSkills.filter(
    (skill) => !skills.has(skill) && proficiencyFor(skill) > 0,
  );
  const proficiency = readinessSkills.length
    ? readinessSkills.reduce(
        (sum, skill) =>
          sum +
          Math.min(
            1,
            proficiencyFor(skill) / Math.min(5, analysis.difficulty + 1),
          ),
        0,
      ) / readinessSkills.length
    : 0.5;
  const semantic = cosineSimilarity(opportunity.embedding, developer.embedding);
  const reportedReadiness =
    opportunity.embedding.length && developer.embedding.length
      ? 0.75 * proficiency + 0.25 * semantic
      : proficiency;
  const evidenceReadiness = readinessSkills.length
    ? (developer.skillEvidence ?? [])
        .filter((backing) => readinessSkills.includes(backing.name))
        .reduce(
          (sum, backing) => sum + skillEvidenceBoost(backing.projects.length),
          0,
        ) / readinessSkills.length
    : 0;
  const technicalReadiness = clamp(
    reportedReadiness + 0.15 * evidenceReadiness,
  );

  const learningTargets = new Set(developer.wantsToLearn.map(normalizeSkill));
  const skillsToDevelop = [
    ...new Set([
      ...technologies,
      ...analysis.learningOpportunities.map(normalizeSkill),
    ]),
  ].filter(
    (skill) =>
      !skills.has(skill) ||
      (learningTargets.has(skill) && (skills.get(skill) ?? 0) < 5),
  );
  const learningAlignment = learningTargets.size
    ? skillsToDevelop.filter((skill) => learningTargets.has(skill)).length /
      Math.min(learningTargets.size, Math.max(1, skillsToDevelop.length))
    : 0.5;
  // Greater experience never reduces challenge fit. Mentorship supports a safe stretch.
  const gap = analysis.difficulty - developer.experienceLevel;
  const challengeFit = clamp(
    1 - Math.max(0, gap - (analysis.mentorshipAvailable ? 1 : 0)) / 3,
  );
  const growthPotential =
    (0.65 * learningAlignment + 0.35 * challengeFit) *
    (0.5 + 0.5 * technicalReadiness);
  const developerInterest = opportunity.interests.length
    ? overlap(opportunity.interests, new Set(developer.interests))
    : 0.5;
  const collaborationFit =
    opportunity.collaboration === "flexible" ||
    developer.collaboration === "flexible" ||
    opportunity.collaboration === developer.collaboration
      ? 1
      : 0.3;
  const timeFit = Math.min(
    1,
    developer.weeklyHours / opportunity.minimumWeeklyHours,
  );
  const locationFit =
    opportunity.remote ||
    developer.city.trim().toLowerCase() ===
      opportunity.city.trim().toLowerCase()
      ? 1
      : 0.4;
  const collaborationCompatibility =
    0.5 * collaborationFit + 0.3 * timeFit + 0.2 * locationFit;
  const opportunityExposure =
    1 / (1 + Math.max(0, developer.recentExposure) / 3);
  const raw = {
    technicalReadiness,
    growthPotential,
    developerInterest,
    collaborationCompatibility,
    opportunityExposure,
  };
  const score = percentage(
    Object.entries(WEIGHTS).reduce(
      (sum, [key, weight]) => sum + raw[key as keyof typeof raw] * weight,
      0,
    ),
  );
  const scores = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, percentage(value)]),
  );
  const explanation = [
    existingRelevantSkills.length
      ? `Relevant skills: ${existingRelevantSkills.join(", ")}.`
      : "No direct skill overlap yet; discuss a small first contribution and support.",
    ...(transferableSkills.length
      ? [
          `Related experience supports ${transferableSkills.join(", ")}; confirm the specific work together.`,
        ]
      : []),
    (developer.skillEvidence ?? []).some((backing) =>
      existingRelevantSkills.includes(backing.name),
    )
      ? "Relevant skills are backed by requester-confirmed project work."
      : "Skill levels and portfolio projects are self-reported.",
    skillsToDevelop.length
      ? `Can develop ${skillsToDevelop.join(", ")}${analysis.mentorshipAvailable ? " with mentorship" : ""}.`
      : "The project offers practical delivery and collaboration experience.",
    gap > (analysis.mentorshipAvailable ? 1 : 0)
      ? "This is a stretch; review support needs before connecting."
      : "Project difficulty is within a supported contribution range.",
  ].join(" ");
  return {
    developerId: developer.id,
    name: developer.name,
    score,
    scores,
    existingRelevantSkills,
    skillsToDevelop,
    explanation,
    considerations: matchConsiderations(opportunity, developer),
  };
}

export function rankDevelopers(
  opportunity: Opportunity,
  developers: Developer[],
  directDeveloperIds: ReadonlySet<string> = new Set(),
) {
  return developers
    .map((developer) =>
      scoreMatch(
        opportunity,
        developer,
        directDeveloperIds.has(developer.id) ? "direct" : "discovery",
      ),
    )
    .filter((match) => match !== null)
    .sort(
      (a, b) => b.score - a.score || a.developerId.localeCompare(b.developerId),
    );
}

export function scoreNearbyRequest(
  request: LocalRequest,
  developer: Developer,
) {
  if (!developer.location) return null;
  const distanceKm = haversineKm(developer.location, request);
  if (distanceKm > developer.location.radiusKm) return null;
  const match = scoreMatch(asMatchOpportunity(request), developer);
  if (!match) return null;
  return {
    requestId: request.id,
    title: request.title,
    description: request.description,
    place: request.place,
    latitude: request.latitude,
    longitude: request.longitude,
    ownerName: request.ownerName,
    distanceKm: Math.round(distanceKm * 10) / 10,
    score: match.score,
    scores: match.scores,
    existingRelevantSkills: match.existingRelevantSkills,
    skillsToDevelop: match.skillsToDevelop,
    explanation: match.explanation,
  };
}

export function requestEligibility(
  request: LocalRequest,
  developer: Developer,
) {
  const reasons: string[] = [];
  if (request.status !== "open" && request.claimedBy !== developer.id)
    reasons.push("This request is no longer open");
  return reasons;
}

export function requestConsiderations(
  request: LocalRequest,
  developer: Developer,
) {
  const considerations = matchConsiderations(
    asMatchOpportunity(request),
    developer,
  );
  if (!developer.location)
    considerations.push(
      "Your search area is not set; confirm the location with the requester.",
    );
  else if (
    haversineKm(developer.location, request) > developer.location.radiusKm
  )
    considerations.push(
      "This request is outside your usual search radius; confirm travel before accepting.",
    );
  return considerations;
}

export function rankNearbyRequests(
  requests: LocalRequest[],
  developer: Developer,
) {
  return requests
    .map((request) => scoreNearbyRequest(request, developer))
    .filter((match) => match !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distanceKm - b.distanceKm ||
        a.requestId.localeCompare(b.requestId),
    );
}
