import { CITY_NAME } from "./calgary-area.ts";

/** The province shown beside the city wherever the full place name appears. */
export const CITY_REGION = "Alberta";
export const CITY_LABEL = `${CITY_NAME}, ${CITY_REGION}`;

/** A weekly time commitment, always worded the same way across the app. */
export function formatWeeklyHours(hours: number): string {
  return `${hours} ${hours === 1 ? "hour" : "hours"}/week`;
}
