import { opportunitySchema, type OpportunityInput } from "../schemas.ts";
import { confirmedBriefSchema, type HiringBrief } from "./schemas.ts";
import { opportunityDraftFromBrief } from "./opportunity-draft.ts";

/** Prepare an editable draft, never publish or invent missing practical details. */
export function postingDraftFromBrief(input: HiringBrief) {
  const { brief } = confirmedBriefSchema.parse({ brief: input });
  const draft: Partial<OpportunityInput> = {};
  const unmappedFields: string[] = [];
  const mapped = opportunityDraftFromBrief(brief);
  for (const [field, value] of Object.entries(mapped) as [
    keyof OpportunityInput,
    unknown,
  ][]) {
    if (value === undefined) continue;
    const result = opportunitySchema.shape[field].safeParse(value);
    if (!result.success) {
      unmappedFields.push(field);
      continue;
    }
    Object.assign(draft, { [field]: result.data });
  }
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
