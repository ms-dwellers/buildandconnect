import {
  normalizeSkill,
  type Developer,
  type LocalRequest,
  type Opportunity,
} from "./schemas.ts";

export const MATCH_VERSION = "growth-v1";
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
): string[] {
  const reasons: string[] = [];
  const skills = new Set(
    developer.skills.map((skill) => normalizeSkill(skill.name)),
  );
  if (!developer.available || !developer.discoverable)
    reasons.push("Not available for discovery");
  if (
    !opportunity.remote &&
    developer.city.trim().toLowerCase() !==
      opportunity.city.trim().toLowerCase()
  )
    reasons.push("Different city");
  if (developer.weeklyHours < opportunity.minimumWeeklyHours)
    reasons.push("Insufficient availability");
  if (opportunity.kind === "volunteer" && !developer.acceptsVolunteer)
    reasons.push("Paid opportunities only");
  for (const skill of opportunity.essentialTechnologies) {
    if (!skills.has(normalizeSkill(skill)))
      reasons.push(`Missing essential technology: ${skill}`);
  }
  return reasons;
}

export function scoreMatch(opportunity: Opportunity, developer: Developer) {
  if (
    opportunity.status !== "open" ||
    eligibility(opportunity, developer).length
  )
    return null;
  const analysis = opportunity.analysis;
  const technologies = [
    ...new Set([
      ...analysis.requiredTechnologies,
      ...analysis.preferredTechnologies,
      ...opportunity.essentialTechnologies,
    ]),
  ];
  const skills = new Map(
    developer.skills.map((skill) => [skill.name, skill.level]),
  );
  const existingRelevantSkills = technologies.filter((skill) =>
    skills.has(skill),
  );
  const required = [
    ...new Set([
      ...analysis.requiredTechnologies,
      ...opportunity.essentialTechnologies,
    ]),
  ];
  const proficiency = required.length
    ? required.reduce(
        (sum, skill) =>
          sum +
          Math.min(
            1,
            (skills.get(skill) ?? 0) / Math.min(5, analysis.difficulty + 1),
          ),
        0,
      ) / required.length
    : 0.5;
  const semantic = cosineSimilarity(opportunity.embedding, developer.embedding);
  const technicalReadiness = 0.75 * proficiency + 0.25 * semantic;

  const learningTargets = new Set(developer.wantsToLearn);
  const skillsToDevelop = [
    ...new Set([...technologies, ...analysis.learningOpportunities]),
  ].filter(
    (skill) => learningTargets.has(skill) && (skills.get(skill) ?? 0) < 5,
  );
  const learningAlignment = learningTargets.size
    ? skillsToDevelop.length / learningTargets.size
    : 0;
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
  const collaborationCompatibility =
    opportunity.collaboration === "flexible" ||
    developer.collaboration === "flexible" ||
    opportunity.collaboration === developer.collaboration
      ? 1
      : 0.3;
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
      : "No listed technologies overlap; review transferable experience.",
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
  };
}

export function rankDevelopers(
  opportunity: Opportunity,
  developers: Developer[],
) {
  return developers
    .map((developer) => scoreMatch(opportunity, developer))
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
