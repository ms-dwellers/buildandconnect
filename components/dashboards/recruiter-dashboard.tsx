"use client";

import { UsersRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardPanel } from "@/components/ui/card";
import { usePaged } from "@/lib/use-api";
import type { PublicDeveloper } from "@/lib/types";
import { EmptyState, ListState, Section } from "./parts";

const COLLABORATION = {
  async: "Works async",
  sync: "Prefers live collaboration",
  flexible: "Flexible collaboration",
} as const;

export function DeveloperCard({ developer }: { developer: PublicDeveloper }) {
  return (
    <Card>
      <CardPanel className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{developer.name}</h3>
            <p className="text-sm text-muted-foreground">
              {developer.city} · Experience level {developer.experienceLevel} of
              5 · {developer.weeklyHours} hrs / week
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!developer.available && (
              <Badge variant="outline">Not available</Badge>
            )}
            {developer.acceptsVolunteer && (
              <Badge variant="secondary">Open to volunteering</Badge>
            )}
          </div>
        </div>
        <p className="text-sm leading-6">{developer.bio}</p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-1.5">
            <dt className="text-xs text-muted-foreground">Skills</dt>
            <dd className="flex flex-wrap gap-1.5">
              {developer.skills.map((skill) => (
                <Badge key={skill.name} variant="outline">
                  {skill.name} · {skill.level}/5
                </Badge>
              ))}
            </dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-xs text-muted-foreground">Wants to learn</dt>
            <dd>{developer.wantsToLearn.join(", ") || "Not specified"}</dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-xs text-muted-foreground">Interests</dt>
            <dd>{developer.interests.join(", ") || "Not specified"}</dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-xs text-muted-foreground">Collaboration</dt>
            <dd>{COLLABORATION[developer.collaboration]}</dd>
          </div>
        </dl>
        {developer.projects.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-xs text-muted-foreground">Projects</h4>
            <ul className="space-y-2">
              {developer.projects.map((project) => (
                <li key={project.title} className="text-sm">
                  <span className="font-medium">{project.title}</span>
                  {project.technologies.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {project.technologies.join(", ")}
                    </span>
                  )}
                  <p className="text-muted-foreground">{project.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardPanel>
    </Card>
  );
}

export function RecruiterDashboard() {
  const developers = usePaged<PublicDeveloper>("/developers");
  return (
    <Section
      title="Discoverable developers"
      description="Only developers who chose to be visible appear here. Contact details are never shared."
    >
      <ListState
        {...developers}
        onRetry={() => void developers.reload()}
        onLoadMore={() => void developers.loadMore()}
        empty={
          <EmptyState
            icon={UsersRoundIcon}
            title="No discoverable developers yet"
            description="Developers appear here once they create a profile and choose to be visible."
          />
        }
      >
        {(developer) => (
          <li key={developer.id}>
            <DeveloperCard developer={developer} />
          </li>
        )}
      </ListState>
    </Section>
  );
}
