"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { TextAreaField, TextField } from "@/components/forms/form-kit";
import { ErrorAlert } from "@/components/app/require-role";
import { api } from "@/lib/api";
import type { SavedCareerTarget } from "@/lib/career";

export function TargetEditor({
  initial,
  onSaved,
  onCancel,
  onReload,
}: {
  initial: SavedCareerTarget | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  onReload: () => Promise<void>;
}) {
  const [sourceText, setSourceText] = useState(initial?.sourceText ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError("");
    setConflict(false);
    try {
      const response = await api<SavedCareerTarget>(
        "/developers/me/career-target",
        {
          method: "PUT",
          body: JSON.stringify({
            sourceText: sourceText.trim(),
            ...(sourceUrl.trim() && { sourceUrl: sourceUrl.trim() }),
            expectedUpdatedAt: initial?.updatedAt ?? 0,
          }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(45_000),
          ]),
        },
      );
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setError(response.error);
        setConflict(response.status === 409);
        return;
      }
      await onSaved();
    } catch {
      if (!controller.signal.aborted)
        setError(
          "The target could not be saved. Your text is still here; check your connection and try again.",
        );
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <Form onSubmit={submit} className="space-y-5">
      <TextAreaField
        name="sourceText"
        label="Target job description"
        description="Paste a real job posting. Its requirements will help you find relevant project work."
        required
        minLength={30}
        maxLength={6000}
        rows={8}
        value={sourceText}
        onChange={(event) => setSourceText(event.target.value)}
        disabled={pending}
      />
      <TextField
        name="sourceUrl"
        type="url"
        label="Source URL (optional)"
        maxLength={2000}
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        disabled={pending}
      />
      <p className="text-sm text-muted-foreground">
        Your target is private. The description is sent to AI for analysis when
        you save; the source URL is not fetched.
      </p>
      {error && <ErrorAlert title="Target not saved" message={error} />}
      {conflict && (
        <Button variant="outline" onClick={() => void onReload()}>
          Load saved target
        </Button>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={pending} disabled={conflict}>
          Save and find projects
        </Button>
        {initial && (
          <Button variant="ghost" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Form>
  );
}
