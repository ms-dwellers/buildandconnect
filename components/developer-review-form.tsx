"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogPanel,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { TextAreaField } from "@/components/forms/form-kit";
import { ErrorAlert } from "@/components/app/require-role";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { DeveloperReputation } from "@/lib/types";

export function DeveloperReviewForm({
  opportunityId,
  developerId,
  name,
}: {
  opportunityId: string;
  developerId: string;
  name: string;
}) {
  const reputation = useApi<DeveloperReputation>(
    `/developers/${encodeURIComponent(developerId)}/reputation`,
  );
  const [rating, setRating] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !confirmed || !rating) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await api(
        `/opportunities/${encodeURIComponent(opportunityId)}/reviews`,
        {
          method: "POST",
          body: JSON.stringify({
            developerId,
            rating: Number(rating),
            comment: String(data.get("comment") ?? ""),
            workedTogether: confirmed,
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      await reputation.reload();
    } catch {
      setError(
        "Feedback could not be saved. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  if (
    saved ||
    reputation.data?.reviews.some(
      (review) => review.opportunityId === opportunityId,
    )
  )
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Feedback shared
      </p>
    );
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Leave feedback
      </DialogTrigger>
      <DialogPopup className="max-w-lg">
        <DialogHeader className="pr-12">
          <DialogTitle className="break-words leading-tight">
            Working with {name}
          </DialogTitle>
          <DialogDescription>
            Review work you actually did together, not a profile or an initial
            conversation. Your name, project and feedback will appear on their
            profile.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <Form onSubmit={submit} className="space-y-5">
            <fieldset disabled={pending} className="space-y-5">
              <div className="space-y-2">
                <Label id={`rating-${developerId}`}>Overall experience</Label>
                <RadioGroup
                  aria-labelledby={`rating-${developerId}`}
                  value={rating}
                  onValueChange={(value) => setRating(String(value))}
                  className="grid grid-cols-5 gap-2"
                  required
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Label
                      key={value}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 has-data-checked:border-primary has-data-checked:bg-secondary"
                    >
                      <Radio
                        value={String(value)}
                        aria-label={`${value} out of 5`}
                      />
                      <span>{value}</span>
                    </Label>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  1 = Poor · 3 = Good · 5 = Excellent
                </p>
              </div>
              <TextAreaField
                name="comment"
                label="What was it like to work together?"
                description="Mention the work, communication and follow-through. 20 to 1,500 characters. Do not include private or contact information."
                required
                minLength={20}
                maxLength={1500}
                rows={4}
              />
              <Label className="flex items-start gap-3 font-sans text-sm leading-6">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={setConfirmed}
                  required
                  className="mt-1"
                />
                I worked with this developer on this project and this is my
                honest experience.
              </Label>
            </fieldset>
            {error && <ErrorAlert title="Feedback not saved" message={error} />}
            <Button
              type="submit"
              loading={pending}
              disabled={!rating || !confirmed}
            >
              Publish feedback
            </Button>
          </Form>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
