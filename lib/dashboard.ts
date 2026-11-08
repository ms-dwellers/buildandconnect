import type { Interest, OpportunityRecord, RequestRecord } from "./types";

export function interestState(
  item: Interest,
  viewer: "developer" | "requester",
) {
  if (item.connected) return "connected";
  const mine =
    viewer === "developer"
      ? item.developerInterested
      : item.requesterInterested;
  const theirs =
    viewer === "developer"
      ? item.requesterInterested
      : item.developerInterested;
  if (theirs && !mine) return "needs-response";
  return mine ? "waiting" : "withdrawn";
}

export function prioritizeInterests(
  items: Interest[],
  viewer: "developer" | "requester",
) {
  const order = { "needs-response": 0, connected: 1, waiting: 2, withdrawn: 3 };
  const priority = (item: Interest) => order[interestState(item, viewer)];
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
