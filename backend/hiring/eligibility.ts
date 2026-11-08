import type { PublicDeveloper } from "../../lib/types.ts";
import type { HiringBrief } from "./schemas.ts";

export function hiringEligibility(
  brief: HiringBrief,
  developer: PublicDeveloper,
): string[] {
  const reasons: string[] = [];
  if (!developer.available || !developer.discoverable)
    reasons.push("Not available for discovery");
  if (brief.compensation.kind === "volunteer" && !developer.acceptsVolunteer)
    reasons.push("Paid projects only");
  const work = developer.workArrangementPreference;
  if (
    work?.required &&
    work.preferred !== "flexible" &&
    brief.workArrangement &&
    brief.workArrangement !== "flexible" &&
    work.preferred !== brief.workArrangement
  )
    reasons.push("Outside required work arrangement");
  const pay = developer.compensationPreference;
  if (
    brief.compensation.kind === "paid" &&
    brief.compensation.period === "hour" &&
    pay &&
    brief.compensation.currency === pay.currency &&
    pay.minimumHourlyRate !== null &&
    brief.compensation.maximum !== null &&
    brief.compensation.maximum < pay.minimumHourlyRate
  )
    reasons.push("Budget below minimum hourly rate");
  return reasons;
}
