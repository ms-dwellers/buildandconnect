import type { Interest, OpportunityRecord, RequestRecord } from "./types";

export function prioritizeInterests(
  items: Interest[],
  viewer: "developer" | "requester",
) {
  const priority = (item: Interest) => {
    const theirs =
      viewer === "developer"
        ? item.requesterInterested
        : item.developerInterested;
    const mine =
      viewer === "developer"
        ? item.developerInterested
        : item.requesterInterested;
    return theirs && !mine ? 0 : item.connected ? 1 : 2;
  };
  return [...items].sort((a, b) => priority(a) - priority(b));
}

export function prioritizeRequests(items: RequestRecord[]) {
  const order = { claimed: 0, open: 1, closed: 2 };
  return [...items].sort((a, b) => order[a.status] - order[b.status]);
}

export function prioritizeOpportunities(items: OpportunityRecord[]) {
  return [...items].sort(
    (a, b) => Number(a.status === "closed") - Number(b.status === "closed"),
  );
}
