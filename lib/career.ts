import type { FunctionReturnType } from "convex/server";
import type { internal as api } from "../convex/_generated/api";
import type { CityJob } from "./calgary-area";

export type SavedCareerTarget = NonNullable<
  FunctionReturnType<typeof api.data.ownCareerTarget>
>;
export type CareerRecommendations = FunctionReturnType<
  typeof api.data.careerRecommendations
>;
export type CareerProject = CareerRecommendations["data"][number];
export type CareerRequirement = CareerRecommendations["requirements"][number];

export const careerProjectKey = (
  project: Pick<CareerProject, "id" | "source">,
) => `${project.source}:${project.id}`;

export function projectsForRequirement(
  projects: CareerProject[],
  requirementId: string | null,
) {
  return requirementId
    ? projects.filter((project) =>
        project.requirementLinks.some(
          (link) => link.requirementId === requirementId,
        ),
      )
    : projects;
}

/** Use the map's existing location/privacy policy rather than career coordinates. */
export function careerMapListings(
  projects: CareerProject[],
  listings: CityJob[],
) {
  const keys = new Set(projects.map(careerProjectKey));
  return listings.filter((listing) => keys.has(careerProjectKey(listing)));
}

export function activitiesForRequirement(
  project: CareerProject,
  requirementId: string | null,
) {
  const links = project.requirementLinks.filter(
    (link) => !requirementId || link.requirementId === requirementId,
  );
  const ids = new Set(
    links.flatMap((link) =>
      link.activityLinks.map((activity) => activity.activityId),
    ),
  );
  return project.activities.filter((activity) => ids.has(activity.id));
}
