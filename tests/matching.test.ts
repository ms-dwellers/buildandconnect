import assert from "node:assert/strict";
import test from "node:test";
import {
  boundingBox,
  cosineSimilarity,
  eligibility,
  haversineKm,
  rankDevelopers,
  rankNearbyRequests,
  scoreMatch,
  scoreNearbyRequest,
  requestEligibility,
  requestConsiderations,
  WEIGHTS,
} from "../backend/matching.ts";
import {
  developerSchema,
  normalizeSkill,
  type LocalRequest,
} from "../backend/schemas.ts";
import {
  analysis,
  developer,
  embedding,
  opportunity,
} from "./fixtures/matching.ts";

test("growth matching uses the specified weights and explains relevant learning", () => {
  const match = scoreMatch(opportunity, developer)!;
  assert.deepEqual(WEIGHTS, {
    technicalReadiness: 0.3,
    growthPotential: 0.3,
    developerInterest: 0.2,
    collaborationCompatibility: 0.1,
    opportunityExposure: 0.1,
  });
  assert.deepEqual(match.existingRelevantSkills, ["react"]);
  assert.deepEqual(match.skillsToDevelop, [
    "typescript",
    "frontend",
    "accessibility",
  ]);
  assert.match(match.explanation, /mentorship/);
  assert.ok(match.score > 70 && match.score <= 100);
});
test("skills, city and hours guide ranking rather than excluding a candidate", () => {
  assert.ok(
    scoreMatch(opportunity, {
      ...developer,
      skills: [{ name: "python", level: 5 }],
    }),
  );
  for (const change of [{ city: "Ottawa" }, { weeklyHours: 1 }]) {
    const match = scoreMatch(opportunity, { ...developer, ...change });
    assert.ok(match);
    assert.ok(match.considerations.length > 0);
  }
});
test("discovery respects visibility and work preferences, while direct interest is intentional", () => {
  for (const change of [
    { available: false },
    { discoverable: false },
    { acceptsVolunteer: false },
  ]) {
    assert.equal(scoreMatch(opportunity, { ...developer, ...change }), null);
  }
  assert.ok(
    scoreMatch(
      opportunity,
      { ...developer, available: false, acceptsVolunteer: false },
      "direct",
    ),
  );
  assert.equal(
    scoreMatch(opportunity, { ...developer, discoverable: false }, "direct"),
    null,
  );
  assert.equal(
    scoreMatch({ ...opportunity, status: "closed" }, developer),
    null,
  );
  assert.deepEqual(
    eligibility(
      { ...opportunity, remote: true, kind: "paid" },
      { ...developer, city: "Ottawa", acceptsVolunteer: false },
    ),
    [],
  );
});
test("mentorship helps a safe stretch and weak readiness limits growth", () => {
  const stretch = {
    ...opportunity,
    analysis: { ...opportunity.analysis, difficulty: 4 },
  };
  const supported = scoreMatch(stretch, developer)!;
  const unsupported = scoreMatch(
    {
      ...stretch,
      analysis: { ...stretch.analysis, mentorshipAvailable: false },
    },
    developer,
  )!;
  assert.ok(
    supported.scores.growthPotential > unsupported.scores.growthPotential,
  );
  assert.ok(
    scoreMatch(opportunity, {
      ...developer,
      skills: [{ name: "react", level: 1 }],
    })!.scores.growthPotential < 100,
  );
});
test("more experience is not an arbitrary disadvantage", () => {
  const senior = {
    ...developer,
    id: "senior",
    experienceLevel: 5,
    skills: [{ name: "react", level: 5 }],
  };
  assert.ok(
    scoreMatch(opportunity, senior)!.score >=
      scoreMatch(opportunity, developer)!.score,
  );
});
test("growth-aligned junior can outrank an experienced but uninterested candidate", () => {
  const senior = {
    ...developer,
    id: "senior",
    experienceLevel: 5,
    skills: [{ name: "react", level: 5 }],
    wantsToLearn: ["rust"],
    interests: ["finance"],
  };
  assert.equal(
    rankDevelopers(opportunity, [senior, developer])[0].developerId,
    developer.id,
  );
});
test("exposure is bounded, small, and ranking ties use stable identifiers", () => {
  const exposed = scoreMatch(opportunity, {
    ...developer,
    recentExposure: 30,
  })!;
  assert.ok(
    exposed.score > 0 &&
      exposed.score < scoreMatch(opportunity, developer)!.score,
  );
  assert.deepEqual(
    rankDevelopers(opportunity, [
      { ...developer, id: "z" },
      { ...developer, id: "a" },
    ]).map((match) => match.developerId),
    ["a", "z"],
  );
});
test("cosine handles zero, malformed, and mismatched vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([0, 0], [0, 0]), 0);
  assert.equal(cosineSimilarity([1], [1, 0]), 0);
  assert.equal(cosineSimilarity([NaN], [1]), 0);
  assert.equal(cosineSimilarity([-1], [1]), 0);
});
test("profiles normalize aliases and reject duplicate skills and injected fields", () => {
  assert.equal(normalizeSkill(" React.js "), "react");
  const {
    id: _id,
    name: _name,
    embedding: _embedding,
    recentExposure: _exposure,
    location: _location,
    ...profile
  } = developer;
  assert.equal(
    developerSchema.safeParse({ ...profile, recentExposure: 0 }).success,
    false,
  );
  assert.equal(
    developerSchema.safeParse({
      ...profile,
      skills: [
        { name: "React.js", level: 1 },
        { name: "react", level: 2 },
      ],
    }).success,
    false,
  );
});

const nearbyRequest: LocalRequest = {
  id: "request",
  ownerId: "neighbor",
  ownerName: "Neighbor",
  title: "Community website",
  description:
    "Build an accessible website for a community garden. React required; TypeScript preferred. Mentorship available.",
  place: "Toronto",
  latitude: 43.66,
  longitude: -79.38,
  analysis,
  embedding,
  status: "open",
  claimedBy: null,
  claimantName: null,
  createdAt: 1,
};

test("a deliberately chosen community request does not require location or discovery opt-in", () => {
  const privateDeveloper = {
    ...developer,
    discoverable: false,
    available: false,
    acceptsVolunteer: false,
    location: null,
  };
  assert.deepEqual(requestEligibility(nearbyRequest, privateDeveloper), []);
  assert.ok(requestConsiderations(nearbyRequest, privateDeveloper).length > 0);
  assert.deepEqual(
    requestEligibility(
      { ...nearbyRequest, status: "claimed", claimedBy: "someone-else" },
      developer,
    ),
    ["This request is no longer open"],
  );
});

test("requester-confirmed skill projects improve relevant readiness with bounded returns", () => {
  const junior = { ...developer, skills: [{ name: "react", level: 1 }] };
  const project = {
    source: "request" as const,
    projectId: "work",
    title: "Garden site",
    requesterName: "Neighbour",
    confirmedAt: 1,
  };
  const baseline = scoreMatch(opportunity, junior)!;
  const backed = scoreMatch(opportunity, {
    ...junior,
    skillEvidence: [{ name: "react", projects: [project] }],
  })!;
  assert.ok(backed.score > baseline.score);
  assert.ok(
    backed.scores.technicalReadiness > baseline.scores.technicalReadiness,
  );
  assert.match(backed.explanation, /requester-confirmed/);
  const unrelated = scoreMatch(opportunity, {
    ...junior,
    skillEvidence: [{ name: "rust", projects: [project] }],
  })!;
  assert.equal(unrelated.score, baseline.score);
  const many = scoreMatch(opportunity, {
    ...junior,
    skillEvidence: [
      {
        name: "react",
        projects: Array.from({ length: 100 }, (_, index) => ({
          ...project,
          projectId: String(index),
        })),
      },
    ],
  })!;
  assert.ok(many.score >= backed.score && many.score <= 100);
});

test("haversine and bounding boxes keep nearby requests inside a radius", () => {
  assert.ok(
    haversineKm(developer.location!, nearbyRequest) <
      developer.location!.radiusKm,
  );
  const box = boundingBox(
    developer.location!.latitude,
    developer.location!.longitude,
    developer.location!.radiusKm,
  );
  assert.ok(nearbyRequest.latitude >= box.minLat);
  assert.ok(nearbyRequest.latitude <= box.maxLat);
  assert.equal(
    scoreNearbyRequest(
      {
        ...nearbyRequest,
        latitude: 45.42,
        longitude: -75.69,
      },
      developer,
    ),
    null,
  );
});

test("nearby request ranking uses growth scores and hides unpaid work from paid-only developers", () => {
  const match = scoreNearbyRequest(nearbyRequest, developer)!;
  assert.ok(match.score > 0);
  assert.equal(match.requestId, nearbyRequest.id);
  assert.equal(
    scoreNearbyRequest(nearbyRequest, {
      ...developer,
      acceptsVolunteer: false,
    }),
    null,
  );
  assert.equal(
    rankNearbyRequests(
      [
        nearbyRequest,
        {
          ...nearbyRequest,
          id: "farther",
          latitude: 43.7,
          longitude: -79.4,
        },
      ],
      developer,
    )[0].requestId,
    nearbyRequest.id,
  );
});
