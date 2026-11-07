import { isInCalgary } from "./calgary-area.ts";
import { first } from "./navigation.ts";

type Params = Record<string, string | string[] | undefined>;

/** A Calgary pin passed from the map as `?lat=..&lng=..`, if valid. */
export function pinFromParams(params: Params) {
  const latitude = Number(first(params.lat));
  const longitude = Number(first(params.lng));
  const point = { latitude, longitude };
  return first(params.lat) && first(params.lng) && isInCalgary(point)
    ? { ...point, place: "Dropped pin" }
    : null;
}
