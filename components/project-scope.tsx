import type { JobAnalysis } from "@/backend/schemas";

export function ProjectScope({ analysis }: { analysis: JobAnalysis }) {
  const tasks =
    analysis.activities?.map((item) => item.description) ??
    analysis.responsibilities;
  return (
    <div className="space-y-5 border-t pt-5">
      {tasks.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Expected work</h3>
          <ul className="list-disc space-y-1 ps-5 text-sm">
            {tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </section>
      )}
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Estimated difficulty</dt>
          <dd>
            {analysis.difficulty} of 5 · {analysis.experienceLevel}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Support</dt>
          <dd>
            {analysis.mentorshipAvailable
              ? "Mentorship is mentioned in the posting. Confirm its availability with the requester."
              : "No mentorship is specified. Confirm any support you need before committing."}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Work and difficulty are AI estimates from the posting, not a guarantee
        of scope or readiness.
      </p>
    </div>
  );
}
