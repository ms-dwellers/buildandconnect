"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { CalgaryCanvas } from "@/components/map/calgary-canvas";
import type { MapFeed } from "@/lib/types";
import {
  activitiesForRequirement,
  careerMapListings,
  careerProjectKey,
  projectsForRequirement,
  type CareerProject,
  type CareerRecommendations,
  type SavedCareerTarget,
} from "@/lib/career";
import { useApi } from "@/lib/use-api";
import { withNext } from "@/lib/navigation";

export function CareerProjects({
  target,
  onReloadTarget,
}: {
  target: SavedCareerTarget;
  onReloadTarget: () => Promise<void>;
}) {
  const projects = useApi<CareerRecommendations>(
    "/developers/me/career-projects?limit=100",
  );
  if (projects.error)
    return (
      <div className="space-y-3">
        <ErrorAlert
          title="Projects could not be loaded"
          message={projects.error.message}
          onRetry={() => void projects.reload()}
        />
        {projects.error.status === 404 && (
          <Button
            render={<a href={withNext("/onboarding", "/career")} />}
            variant="outline"
          >
            Set up your developer profile
          </Button>
        )}
      </div>
    );
  if (!projects.data) return <LoadingBlock />;
  if (projects.data.targetUpdatedAt !== target.updatedAt)
    return (
      <ErrorAlert
        title="Your target has changed"
        message="Load the saved target before exploring its projects."
        onRetry={() => void onReloadTarget()}
      />
    );
  return <ProjectExplorer recommendations={projects.data} />;
}

function ProjectExplorer({
  recommendations,
}: {
  recommendations: CareerRecommendations;
}) {
  const map = useApi<MapFeed>("/map");
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const visible = useMemo(
    () => projectsForRequirement(recommendations.data, requirementId),
    [recommendations.data, requirementId],
  );
  const pins = useMemo(
    () => careerMapListings(visible, map.data?.listings ?? []),
    [visible, map.data],
  );
  const selected = pins.find((pin) => careerProjectKey(pin) === selectedKey);
  const requirement = recommendations.requirements.find(
    (item) => item.id === requirementId,
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="career-requirements" className="space-y-4">
        <h2 id="career-requirements" className="text-2xl font-semibold">
          Find work that builds your experience
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a requirement to explore related projects. Profile skills are
          self-reported unless backed by requester-confirmed work; project
          practice does not award a qualification or guarantee a job.
        </p>
        <Button
          variant={requirementId ? "outline" : "secondary"}
          aria-pressed={requirementId === null}
          onClick={() => {
            setRequirementId(null);
            setSelectedKey(null);
          }}
        >
          All requirements
        </Button>
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.requirements.map((item) => (
            <Card
              key={item.id}
              className={
                requirementId === item.id
                  ? "border-primary bg-secondary/40"
                  : ""
              }
            >
              <CardPanel className="space-y-3 p-5">
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal text-start"
                  aria-pressed={requirementId === item.id}
                  onClick={() => {
                    setRequirementId(item.id);
                    setSelectedKey(null);
                  }}
                >
                  {item.description}
                </Button>
                <blockquote className="border-s-2 ps-3 text-sm text-muted-foreground">
                  “{item.sourceQuote}”
                </blockquote>
                {item.selfReportedSkills.length > 0 && (
                  <p className="text-sm">
                    In your profile: {item.selfReportedSkills.join(", ")}
                  </p>
                )}
                {item.confirmedSkills.length > 0 && (
                  <p className="text-sm text-primary">
                    Requester-confirmed practice:{" "}
                    {item.confirmedSkills.join(", ")}
                  </p>
                )}
                {item.missingSkills.length > 0 && (
                  <p className="text-sm">
                    Find practice in: {item.missingSkills.join(", ")}
                  </p>
                )}
                {item.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This requirement cannot be demonstrated by a single project.
                  </p>
                )}
              </CardPanel>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="career-projects" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="career-projects" className="text-2xl font-semibold">
            {requirement
              ? "Projects for this requirement"
              : "Projects for your target"}
          </h2>
          <p role="status" className="text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? "project" : "projects"} ·{" "}
            {pins.length} on the Calgary map
          </p>
        </div>
        {!recommendations.nearbyRequestsAvailable && (
          <p className="text-sm text-muted-foreground">
            <a
              className="underline underline-offset-4"
              href={`${withNext("/profile", "/career")}#area`}
            >
              Set your search area
            </a>{" "}
            to include nearby community requests.
          </p>
        )}
        {recommendations.total > recommendations.data.length && (
          <p className="text-sm text-muted-foreground">
            Showing the first {recommendations.data.length} of{" "}
            {recommendations.total} projects. Requirement filtering applies to
            these results.
          </p>
        )}
        {map.error ? (
          <ErrorAlert
            title="Map could not be loaded"
            message={map.error.message}
            onRetry={() => void map.reload()}
          />
        ) : map.loading ? (
          <LoadingBlock rows={1} />
        ) : (
          <>
            <div
              className="h-[26rem] overflow-hidden rounded-xl border"
              aria-label="Projects linked to your selected career requirement"
            >
              <CalgaryCanvas
                jobs={pins}
                selectedId={selected?.id ?? null}
                onSelect={(id) => {
                  const pin = pins.find((item) => item.id === id);
                  setSelectedKey(pin ? careerProjectKey(pin) : null);
                }}
                placing={false}
                onPick={() => {}}
                renderActions={(job) => (
                  <Button
                    size="sm"
                    onClick={() => {
                      const card = document.getElementById(
                        `career-project-${job.source}-${job.id}`,
                      );
                      card?.scrollIntoView({
                        behavior: "instant",
                        block: "center",
                      });
                      card?.focus({ preventScroll: true });
                    }}
                  >
                    Read project activities
                  </Button>
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Only projects with a visible Calgary map listing appear as pins.
              Other relevant projects remain below.
            </p>
          </>
        )}
        {visible.length === 0 ? (
          <Card>
            <CardPanel className="space-y-3 p-6">
              <h3 className="font-semibold">
                {requirement
                  ? "No projects for this requirement yet"
                  : "No suitable projects yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {requirement?.skills.length === 0
                  ? "Credentials and employment history are not earned by completing a project."
                  : "Try another requirement, or review your profile and search area. New projects may offer different opportunities to practice."}
              </p>
              {requirementId && (
                <Button
                  variant="outline"
                  onClick={() => setRequirementId(null)}
                >
                  Show all relevant projects
                </Button>
              )}
              <Button render={<a href="/profile" />} variant="ghost">
                Review profile and area
              </Button>
            </CardPanel>
          </Card>
        ) : (
          <ul
            className="grid gap-4 lg:grid-cols-2"
            aria-label="Career project results"
          >
            {visible.map((project) => (
              <li
                key={careerProjectKey(project)}
                id={`career-project-${project.source}-${project.id}`}
                tabIndex={-1}
                className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ProjectCard
                  project={project}
                  requirementId={requirementId}
                  selected={selectedKey === careerProjectKey(project)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProjectCard({
  project,
  requirementId,
  selected,
}: {
  project: CareerProject;
  requirementId: string | null;
  selected: boolean;
}) {
  const activities = activitiesForRequirement(project, requirementId);
  const links = project.requirementLinks.filter(
    (link) => !requirementId || link.requirementId === requirementId,
  );
  const practice = [
    ...new Set(links.flatMap((link) => link.gapSkillsWithPractice)),
  ];
  return (
    <Card className={`h-full ${selected ? "border-primary" : ""}`}>
      <CardPanel className="space-y-4 p-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{project.title}</h3>
          <p className="font-mono text-xs text-muted-foreground">
            {project.city}
            {"distanceKm" in project
              ? ` · ${project.distanceKm} km away`
              : ""}{" "}
            · {project.source === "request" ? "Community request" : "Project"}
          </p>
        </div>
        <p className="line-clamp-3 whitespace-pre-line text-sm leading-6">
          {project.description}
        </p>
        {project.existingRelevantSkills.length > 0 && (
          <p className="text-sm">
            You bring: {project.existingRelevantSkills.join(", ")}
          </p>
        )}
        {practice.length > 0 && (
          <p className="text-sm">You could practice: {practice.join(", ")}</p>
        )}
        <div className="space-y-2">
          <h4 className="font-medium">Relevant project activities</h4>
          {activities.length > 0 ? (
            <ul className="practice-trail space-y-4 text-sm">
              {activities.map((activity) => (
                <li key={activity.id}>
                  {activity.description}
                  <span className="block text-muted-foreground">
                    {activity.skills.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Related skills were identified, but no concrete activity has been
              extracted for this requirement. Review the scope with the
              requester.
            </p>
          )}
        </div>
        {project.actionIneligibleReasons.length > 0 && (
          <div className="text-sm">
            <h4 className="font-medium">Before you can respond</h4>
            <ul className="list-disc ps-5">
              {project.actionIneligibleReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        <Button
          render={
            <a
              href={
                project.source === "request"
                  ? `/requests/${encodeURIComponent(project.id)}`
                  : `/opportunities/${encodeURIComponent(project.id)}`
              }
            />
          }
          variant="outline"
        >
          Review project
        </Button>
      </CardPanel>
    </Card>
  );
}
