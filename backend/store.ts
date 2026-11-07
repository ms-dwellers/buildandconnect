import type { BackendEnv } from "./env.ts";
import {
  analysisSchema,
  developerSchema,
  opportunitySchema,
  vectorSchema,
  type Developer,
  type Opportunity,
} from "./schemas.ts";

type DB = BackendEnv["DB"];
type DeveloperRow = {
  user_id: string;
  name: string;
  profile: string;
  embedding: string;
  recent_exposure: number;
};
type OpportunityRow = {
  id: string;
  owner_id: string;
  details: string;
  analysis: string;
  embedding: string;
  status: "open" | "closed";
};

function readDeveloper(row: DeveloperRow): Developer {
  return {
    ...developerSchema.parse(JSON.parse(row.profile)),
    id: row.user_id,
    name: row.name,
    embedding: vectorSchema.parse(JSON.parse(row.embedding)),
    recentExposure: row.recent_exposure,
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

const developerSelect = `SELECT d.*, u.name,
  (SELECT count(*) FROM interest i WHERE i.developer_id = d.user_id AND i.first_company_interest_at >= ?) AS recent_exposure
  FROM developer d JOIN user u ON u.id = d.user_id`;
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

export function publicDeveloper(developer: Developer) {
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
