"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { FieldMessage, parseList } from "@/components/forms/form-kit";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ProjectSkillEvidence as Evidence } from "@/lib/types";

export function ProjectSkillEvidence({
  source,
  projectId,
  owner = false,
  canSubmit = false,
}: {
  source: "opportunity" | "request";
  projectId: string;
  owner?: boolean;
  canSubmit?: boolean;
}) {
  const path = `/${source === "request" ? "requests" : "opportunities"}/${encodeURIComponent(projectId)}/skill-evidence`;
  const evidence = useApi<{ data: Evidence[] }>(path);
  const reload = evidence.reload;
  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [reload]);
  return (
    <Card>
      <CardPanel className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">
              Skills used on this project
            </h3>
            <Button
              size="sm"
              variant="outline"
              disabled={evidence.loading}
              onClick={() => void evidence.reload()}
            >
              Refresh
            </Button>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Record actual contributions, not just a connection or assignment.
            Each project strengthens a skill only after the requester confirms
            using it together.
          </p>
        </div>
        {evidence.error ? (
          <ErrorAlert
            title="Skill evidence could not be loaded"
            message={evidence.error.message}
            onRetry={() => void evidence.reload()}
          />
        ) : !evidence.data ? (
          <LoadingBlock rows={1} />
        ) : (
          <>
            {evidence.data.data.map((row) => (
              <EvidenceRecord
                key={row.id}
                evidence={row}
                owner={owner}
                onConfirmed={evidence.reload}
              />
            ))}
            {!owner && canSubmit && evidence.data.data.length === 0 && (
              <EvidenceForm path={path} onSaved={evidence.reload} />
            )}
            {evidence.data.data.length === 0 && (owner || !canSubmit) && (
              <p className="text-sm text-muted-foreground">
                {owner
                  ? "Developer contributions will appear here for your confirmation. Confirm only skills you observed in the work."
                  : "Connect with the requester first, then record the work you actually contributed."}
              </p>
            )}
          </>
        )}
      </CardPanel>
    </Card>
  );
}

function EvidenceForm({
  path,
  onSaved,
}: {
  path: string;
  onSaved: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await api(path, {
        method: "POST",
        body: JSON.stringify({
          skills: parseList(data.get("skills")),
          contribution: String(data.get("contribution")),
        }),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onSaved();
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Label className="grid gap-2">
        Skills you actually used
        <Input
          name="skills"
          required
          maxLength={3000}
          placeholder="React, accessibility, testing"
        />
        <span className="text-xs font-normal text-muted-foreground">
          Separate skills with commas. You can include a new skill you learned
          on this project.
        </span>
      </Label>
      <Label className="grid gap-2">
        Your contribution
        <Textarea
          name="contribution"
          required
          minLength={20}
          maxLength={1500}
          rows={4}
          placeholder="What did you build, and how did you use these skills? Include a demo or repository link if available."
        />
      </Label>
      <FieldMessage>{error}</FieldMessage>
      <p className="text-xs leading-5 text-muted-foreground">
        After confirmation, your contribution and confirmed skills appear on
        your visible profile with the project title and requester’s name.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request skill confirmation"}
      </Button>
    </form>
  );
}

function EvidenceRecord({
  evidence,
  owner,
  onConfirmed,
}: {
  evidence: Evidence;
  owner: boolean;
  onConfirmed: () => Promise<void>;
}) {
  const [skills, setSkills] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (pending || !skills.length) return;
    setPending(true);
    setError(null);
    try {
      const result = await api(
        `/skill-evidence/${encodeURIComponent(evidence.id)}/confirmation`,
        { method: "PUT", body: JSON.stringify({ skills }) },
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onConfirmed();
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="space-y-4 border-t pt-4">
      <h4 className="font-semibold">{evidence.developerName}</h4>
      <p className="whitespace-pre-line text-sm leading-6">
        {evidence.contribution}
      </p>
      {evidence.confirmedAt !== null ? (
        <p role="status" className="text-sm text-primary">
          Requester-confirmed: {evidence.confirmedSkills.join(" · ")}. Added to
          this developer’s skill backing.
        </p>
      ) : owner ? (
        <>
          <p className="text-sm text-muted-foreground">
            Select only the skills you saw this developer use. Your name and the
            project title will appear with this endorsement on their visible
            profile. This is not a qualification or proficiency rating.
          </p>
          <div className="flex flex-wrap gap-3">
            {evidence.skills.map((skill) => (
              <Label key={skill} className="flex min-h-11 items-center gap-2">
                <Checkbox
                  checked={skills.includes(skill)}
                  onCheckedChange={(checked) =>
                    setSkills((current) =>
                      checked
                        ? [...current, skill]
                        : current.filter((name) => name !== skill),
                    )
                  }
                />
                {skill}
              </Label>
            ))}
          </div>
          <FieldMessage>{error}</FieldMessage>
          <Button
            disabled={!skills.length || pending}
            onClick={() => void confirm()}
          >
            {pending ? "Confirming…" : "Confirm skills used"}
          </Button>
        </>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Awaiting requester confirmation: {evidence.skills.join(" · ")}. No
          skill boost has been awarded yet.
        </p>
      )}
    </article>
  );
}
