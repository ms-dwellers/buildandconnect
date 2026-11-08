import type { HiringBrief } from "./schemas.ts";
import type { OpportunityInput } from "../schemas.ts";

export type OpportunityDraft = Partial<OpportunityInput>;

export function opportunityDraftFromBrief(
  brief: HiringBrief,
): OpportunityDraft {
  const { compensation } = brief;
  const number = (value: number) =>
    new Intl.NumberFormat("en", { maximumFractionDigits: 20 }).format(value);
  let amount = "";
  if (compensation.minimum !== null && compensation.maximum !== null) {
    amount =
      compensation.minimum === compensation.maximum
        ? number(compensation.minimum)
        : `${number(compensation.minimum)}–${number(compensation.maximum)}`;
  } else if (compensation.minimum !== null)
    amount = `from ${number(compensation.minimum)}`;
  else if (compensation.maximum !== null)
    amount = `up to ${number(compensation.maximum)}`;
  const pay = [
    compensation.currency,
    amount,
    compensation.period ? `per ${compensation.period}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const hours =
    brief.weeklyHours === null ? "" : `${brief.weeklyHours} hrs/week`;
  const commitment = [hours, brief.timeline].filter(Boolean).join(" · ");
  const arrangement = brief.workArrangement
    ? `Work arrangement: ${brief.workArrangement}`
    : null;
  const description = [
    brief.description,
    brief.technologies.length
      ? `Technology preferences: ${brief.technologies.join(", ")}`
      : null,
    brief.communitiesServed.length
      ? `Who this helps: ${brief.communitiesServed.join(", ")}`
      : null,
    arrangement,
    commitment.length > 80 && brief.timeline
      ? `Timeline: ${brief.timeline}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    title: brief.title ?? "",
    description,
    city: brief.location ?? "",
    ...(brief.workArrangement && {
      remote:
        brief.workArrangement === "remote" ||
        brief.workArrangement === "flexible",
    }),
    ...(compensation.kind && { kind: compensation.kind }),
    ...(compensation.kind === "paid" && pay && { compensation: pay }),
    ...(brief.weeklyHours !== null && {
      minimumWeeklyHours: brief.weeklyHours,
    }),
    ...(commitment && {
      commitment: commitment.length <= 80 ? commitment : hours || undefined,
    }),
    // A technology preference must not become a hard matching exclusion.
    essentialTechnologies: [],
    interests: [...brief.causes],
  };
}
