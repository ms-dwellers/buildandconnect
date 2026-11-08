import type { HiringBrief } from "../backend/hiring/schemas.ts";
import type { OpportunityInput } from "./types.ts";

/** The fields of the opportunity form a voice brief can prefill. */
export type OpportunityDraft = Partial<
  Pick<
    OpportunityInput,
    | "title"
    | "description"
    | "city"
    | "remote"
    | "kind"
    | "essentialTechnologies"
    | "minimumWeeklyHours"
    | "collaboration"
    | "interests"
    | "compensation"
    | "commitment"
  >
>;

const DRAFT_KEY = "bandc.opportunity-draft";

const COLLABORATION: Record<
  NonNullable<HiringBrief["workArrangement"]>,
  OpportunityInput["collaboration"]
> = {
  remote: "async",
  hybrid: "flexible",
  onsite: "sync",
  flexible: "flexible",
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function describeCompensation(compensation: HiringBrief["compensation"]) {
  if (compensation.kind !== "paid") return undefined;
  const { minimum, maximum, currency, period } = compensation;
  const amount = minimum ?? maximum;
  if (amount === null || amount === undefined) return undefined;
  const range =
    minimum !== null &&
    minimum !== undefined &&
    maximum !== null &&
    maximum !== undefined &&
    maximum !== minimum
      ? `${minimum} to ${maximum}`
      : String(amount);
  return [currency, range, period ? `per ${period}` : null]
    .filter(Boolean)
    .join(" ");
}

/** What the voice brief already knows, shaped for the opportunity form. */
export function opportunityDraftFromBrief(
  brief: HiringBrief,
): OpportunityDraft {
  const draft: OpportunityDraft = {
    kind: brief.compensation.kind ?? "volunteer",
    remote: brief.workArrangement === "remote",
  };
  if (brief.title) draft.title = brief.title;
  if (brief.description) draft.description = brief.description;
  if (brief.location) draft.city = brief.location;
  if (brief.workArrangement)
    draft.collaboration = COLLABORATION[brief.workArrangement];
  const technologies = unique(brief.technologies);
  if (technologies.length) draft.essentialTechnologies = technologies;
  const interests = unique([...brief.causes, ...brief.communitiesServed]);
  if (interests.length) draft.interests = interests;
  if (brief.weeklyHours) draft.minimumWeeklyHours = brief.weeklyHours;
  if (brief.timeline) draft.commitment = brief.timeline;
  const compensation = describeCompensation(brief.compensation);
  if (compensation) draft.compensation = compensation;
  return draft;
}

export function storeOpportunityDraft(draft: OpportunityDraft) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Reads the draft once; the next visit to the form starts clean. */
export function takeOpportunityDraft(): OpportunityDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(DRAFT_KEY);
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as OpportunityDraft)
      : null;
  } catch {
    return null;
  }
}
