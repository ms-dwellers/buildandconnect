import type { BackendEnv } from "./env.ts";
import { boundingBox } from "./matching.ts";
import {
  analysisSchema,
  developerSchema,
  opportunitySchema,
  vectorSchema,
  type Developer,
  type DeveloperLocation,
  type LocalRequest,
  type Opportunity,
  type RequestStatus,
} from "./schemas.ts";

type DB = BackendEnv["DB"];
type DeveloperRow = {
  user_id: string;
  name: string;
  profile: string;
  embedding: string;
  recent_exposure: number;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
};
type OpportunityRow = {
  id: string;
  owner_id: string;
  details: string;
  analysis: string;
  embedding: string;
  status: "open" | "closed";
};
type RequestRow = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description: string;
  place: string;
  latitude: number;
  longitude: number;
  analysis: string;
  embedding: string;
  status: RequestStatus;
  claimed_by: string | null;
  claimant_name: string | null;
  created_at: number;
};

function readLocation(row: DeveloperRow): DeveloperLocation | null {
  if (
    row.latitude == null ||
    row.longitude == null ||
    row.radius_km == null ||
    !Number.isFinite(row.latitude) ||
    !Number.isFinite(row.longitude) ||
    !Number.isFinite(row.radius_km)
  )
    return null;
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    radiusKm: row.radius_km,
  };
}

function readDeveloper(row: DeveloperRow): Developer {
  return {
    ...developerSchema.parse(JSON.parse(row.profile)),
    id: row.user_id,
    name: row.name,
    embedding: vectorSchema.parse(JSON.parse(row.embedding)),
    recentExposure: row.recent_exposure,
    location: readLocation(row),
  };
}
function readOpportunity(row: OpportunityRow): Opportunity {
  return {
    ...opportunitySchema.parse(JSON.parse(row.details)),
    id: row.id,
    ownerId: row.owner_id,
    status: row.status,
    analysis: analysisSchema.parse(JSON.parse(row.analysis)),
    embedding: vectorSchema.parse(JSON.parse(row.embedding)),
  };
}
function readRequest(row: RequestRow): LocalRequest {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    title: row.title,
    description: row.description,
    place: row.place,
    latitude: row.latitude,
    longitude: row.longitude,
    analysis: analysisSchema.parse(JSON.parse(row.analysis)),
    embedding: vectorSchema.parse(JSON.parse(row.embedding)),
    status: row.status,
    claimedBy: row.claimed_by,
    claimantName: row.claimant_name,
    createdAt: row.created_at,
  };
}

const developerSelect = `SELECT d.*, u.name,
  (SELECT count(*) FROM interest i WHERE i.developer_id = d.user_id AND i.first_company_interest_at >= ?) AS recent_exposure
  FROM developer d JOIN user u ON u.id = d.user_id`;
const requestSelect = `SELECT r.*, owner.name AS owner_name, claimant.name AS claimant_name
  FROM request r
  JOIN user owner ON owner.id = r.owner_id
  LEFT JOIN user claimant ON claimant.id = r.claimed_by`;
const exposureSince = () => Date.now() - 30 * 24 * 60 * 60 * 1000;

export async function getDeveloper(db: DB, id: string) {
  const row = await db
    .prepare(`${developerSelect} WHERE d.user_id = ?`)
    .bind(exposureSince(), id)
    .first<DeveloperRow>();
  return row ? readDeveloper(row) : null;
}
export async function getOpportunity(db: DB, id: string) {
  const row = await db
    .prepare("SELECT * FROM opportunity WHERE id = ?")
    .bind(id)
    .first<OpportunityRow>();
  return row ? readOpportunity(row) : null;
}
export async function getRequest(db: DB, id: string) {
  const row = await db
    .prepare(`${requestSelect} WHERE r.id = ?`)
    .bind(id)
    .first<RequestRow>();
  return row ? readRequest(row) : null;
}
export async function listCandidates(db: DB, opportunity: Opportunity) {
  const rows = await db
    .prepare(
      `${developerSelect}
    WHERE json_extract(d.profile, '$.available') = 1
      AND json_extract(d.profile, '$.discoverable') = 1
      AND json_extract(d.profile, '$.weeklyHours') >= ?
      AND (? = 1 OR lower(trim(json_extract(d.profile, '$.city'))) = lower(trim(?)))
      AND (? = 'paid' OR json_extract(d.profile, '$.acceptsVolunteer') = 1)
    ORDER BY d.user_id LIMIT 1001`,
    )
    .bind(
      exposureSince(),
      opportunity.minimumWeeklyHours,
      opportunity.remote ? 1 : 0,
      opportunity.city,
      opportunity.kind,
    )
    .all<DeveloperRow>();
  return rows.results.map(readDeveloper);
}
export async function listDevelopers(db: DB, after: string, limit: number) {
  const rows = await db
    .prepare(
      `${developerSelect} WHERE d.user_id > ? AND json_extract(d.profile, '$.discoverable') = 1 ORDER BY d.user_id LIMIT ?`,
    )
    .bind(exposureSince(), after, limit + 1)
    .all<DeveloperRow>();
  return rows.results.map(readDeveloper);
}
export async function listOpportunities(
  db: DB,
  after: string,
  limit: number,
  city?: string,
  kind?: "paid" | "volunteer",
) {
  const rows = await db
    .prepare(
      `SELECT * FROM opportunity WHERE status = 'open' AND id > ?
    AND (? IS NULL OR json_extract(details, '$.remote') = 1 OR lower(trim(json_extract(details, '$.city'))) = lower(trim(?)))
    AND (? IS NULL OR json_extract(details, '$.kind') = ?) ORDER BY id LIMIT ?`,
    )
    .bind(
      after,
      city ?? null,
      city ?? null,
      kind ?? null,
      kind ?? null,
      limit + 1,
    )
    .all<OpportunityRow>();
  return rows.results.map(readOpportunity);
}
export async function listOwnedRequests(
  db: DB,
  ownerId: string,
  after: string,
  limit: number,
) {
  const rows = await db
    .prepare(
      `${requestSelect} WHERE r.owner_id = ? AND r.id > ? ORDER BY r.id LIMIT ?`,
    )
    .bind(ownerId, after, limit + 1)
    .all<RequestRow>();
  return rows.results.map(readRequest);
}
export async function listNearbyRequestCandidates(
  db: DB,
  location: DeveloperLocation,
) {
  const box = boundingBox(
    location.latitude,
    location.longitude,
    location.radiusKm,
  );
  const rows = await db
    .prepare(
      `${requestSelect}
    WHERE r.status = 'open'
      AND r.latitude BETWEEN ? AND ?
      AND r.longitude BETWEEN ? AND ?
    ORDER BY r.id LIMIT 1001`,
    )
    .bind(box.minLat, box.maxLat, box.minLng, box.maxLng)
    .all<RequestRow>();
  return rows.results.map(readRequest);
}

export function publicDeveloper(developer: Developer) {
  const {
    embedding: _embedding,
    recentExposure: _exposure,
    location: _location,
    ...profile
  } = developer;
  return profile;
}
export function ownDeveloper(developer: Developer) {
  const {
    embedding: _embedding,
    recentExposure: _exposure,
    ...profile
  } = developer;
  return profile;
}
export function publicOpportunity(opportunity: Opportunity) {
  const { embedding: _embedding, ...details } = opportunity;
  return details;
}
export function publicRequest(request: LocalRequest) {
  const { embedding: _embedding, ...details } = request;
  return details;
}
