import { opportunitySchema, type OpportunityInput } from "../schemas.ts";
import { confirmedBriefSchema, type HiringBrief } from "./schemas.ts";

/** Prepare an editable draft, never publish or invent missing practical details. */
export function postingDraftFromBrief(input: HiringBrief) {
  const { brief } = confirmedBriefSchema.parse({ brief: input });
  const draft: Partial<OpportunityInput> = {};
  const unmappedFields: string[] = [];
  function copy<K extends keyof OpportunityInput>(
    field: K,
    value: unknown,
    source: string,
  ) {
    const result = opportunitySchema.shape[field].safeParse(value);
    if (!result.success) {
      unmappedFields.push(source);
      return;
    }
    Object.assign(draft, { [field]: result.data });
  }
  copy("title", brief.title, "title");
  copy("description", brief.description, "description");
  copy("interests", brief.causes, "causes");
  // Preferences in a brief must not silently become hard eligibility gates.
  draft.essentialTechnologies = [];
  if (brief.compensation.kind !== null) draft.kind = brief.compensation.kind;
  if (brief.weeklyHours !== null) draft.minimumWeeklyHours = brief.weeklyHours;
  if (brief.workArrangement === "remote") draft.remote = true;
  else if (brief.workArrangement === "onsite") draft.remote = false;
  else if (brief.workArrangement !== null)
    unmappedFields.push("workArrangement");
  if (brief.timeline !== null) copy("commitment", brief.timeline, "timeline");
  if (brief.location !== null) unmappedFields.push("location");
  if (brief.technologies.length) unmappedFields.push("technologies");
  if (brief.communitiesServed.length) unmappedFields.push("communitiesServed");
  if (
    [
      brief.compensation.currency,
      brief.compensation.period,
      brief.compensation.minimum,
      brief.compensation.maximum,
    ].some((value) => value !== null)
  )
    unmappedFields.push("compensation");
  const validation = opportunitySchema.safeParse(draft);
  const missingFields = validation.success
    ? []
    : [
        ...new Set(
          validation.error.issues.map((issue) => String(issue.path[0])),
        ),
      ];
  return {
    draft,
    reviewedBrief: brief,
    missingFields,
    unmappedFields,
    needsMapPin: true,
    requiresConfirmation: true,
  };
}
