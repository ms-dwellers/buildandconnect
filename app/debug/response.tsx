"use client";

import { useState } from "react";
import { CopyIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { isRecord } from "./requests.ts";
import type { DebugResult } from "./use-debug-api.ts";

const factors: Record<string, string> = {
  technicalReadiness: "Technical readiness",
  growthPotential: "Growth potential",
  developerInterest: "Developer interest",
  collaborationCompatibility: "Collaboration",
  opportunityExposure: "Opportunity exposure",
};
const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .join(", ")
    : "";

export function DebugResponse({
  result,
  onOpportunity,
  onDeveloper,
}: {
  result: DebugResult | null;
  onOpportunity: (id: string) => void;
  onDeveloper: (id: string) => void;
}) {
  const [jsonView, setJsonView] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const data = result?.data;
  const records =
    isRecord(data) && Array.isArray(data.data)
      ? data.data.filter(isRecord)
      : [];
  const matches = records.filter(
    (item) =>
      typeof item.developerId === "string" &&
      typeof item.score === "number" &&
      Number.isFinite(item.score) &&
      isRecord(item.scores),
  );
  const opportunities =
    result?.path.startsWith("/api/opportunities") &&
    !result.path.includes("/interest") &&
    !result.path.includes("/match")
      ? (isRecord(data) && typeof data.id === "string"
          ? [data]
          : records
        ).filter(
          (item) =>
            typeof item.id === "string" && typeof item.title === "string",
        )
      : [];
  const developers = result?.path.startsWith("/api/developers")
    ? (isRecord(data) && typeof data.id === "string" ? [data] : records).filter(
        (item) => typeof item.id === "string",
      )
    : [];

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopyStatus("Copied redacted response.");
    } catch {
      setCopyStatus("Copy unavailable. Select the JSON to copy it manually.");
    }
  }

  return (
    <Card
      className="min-w-0"
      render={<section aria-labelledby="response-heading" />}
    >
      <CardHeader className="gap-3 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle render={<h2 id="response-heading" />}>Response</CardTitle>
          {result && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  result.status !== null && result.status < 400
                    ? "success"
                    : "error"
                }
              >
                {result.status ?? "Network error"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {result.duration} ms
              </span>
              <Button size="sm" variant="outline" onClick={copy}>
                <CopyIcon aria-hidden="true" />
                Copy JSON
              </Button>
            </div>
          )}
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {result
            ? `${result.method} ${result.path} - ${result.status ?? "network error"} in ${result.duration} ms`
            : "Send a request to inspect its response."}
        </p>
      </CardHeader>
      <CardPanel className="space-y-4 pt-5">
        {result ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Credentials redacted</Badge>
              <span>Cache-Control: {result.cacheControl ?? "not set"}</span>
              {matches.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setJsonView(!jsonView)}
                >
                  {jsonView ? "Show match cards" : "Show raw JSON"}
                </Button>
              )}
            </div>
            {matches.length > 0 && !jsonView ? (
              <ol className="space-y-3">
                {matches.map((match, index) => (
                  <li
                    key={String(match.developerId)}
                    className="space-y-3 rounded-xl border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">
                        {index + 1}.{" "}
                        {typeof match.name === "string"
                          ? match.name
                          : "Developer"}
                      </h3>
                      <Badge variant="success" size="lg">
                        {String(match.score)}% match
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                      {Object.entries(
                        isRecord(match.scores) ? match.scores : {},
                      ).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-muted-foreground">
                            {factors[key] ?? key}
                          </dt>
                          <dd className="mt-1 font-mono font-medium">
                            {typeof value === "number"
                              ? `${value}%`
                              : "Unavailable"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-sm leading-6">
                      {typeof match.explanation === "string"
                        ? match.explanation
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Relevant:{" "}
                      {stringList(match.existingRelevantSkills) ||
                        "None listed"}
                      <br />
                      Can develop:{" "}
                      {stringList(match.skillsToDevelop) || "None listed"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeveloper(String(match.developerId))}
                    >
                      Use developer ID
                    </Button>
                  </li>
                ))}
              </ol>
            ) : (
              <pre
                aria-label="Response JSON"
                tabIndex={0}
                className="max-h-[34rem] overflow-auto rounded-xl border bg-background p-4 font-mono text-xs leading-6 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
            {(opportunities.length > 0 || developers.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {opportunities.map((item) => (
                  <Button
                    key={String(item.id)}
                    size="sm"
                    variant="outline"
                    onClick={() => onOpportunity(String(item.id))}
                  >
                    Use opportunity: {String(item.title)}
                  </Button>
                ))}
                {developers.map((item) => (
                  <Button
                    key={String(item.id)}
                    size="sm"
                    variant="outline"
                    onClick={() => onDeveloper(String(item.id))}
                  >
                    Use developer:{" "}
                    {typeof item.name === "string"
                      ? item.name
                      : String(item.id)}
                  </Button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Try{" "}
            <strong className="font-medium text-foreground">
              Check health
            </strong>{" "}
            first. It does not require an account.
          </div>
        )}
        <p role="status" className="text-xs text-muted-foreground">
          {copyStatus}
        </p>
      </CardPanel>
    </Card>
  );
}
