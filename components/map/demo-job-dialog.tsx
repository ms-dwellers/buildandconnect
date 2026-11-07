"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { isInCalgary, type CityJob, type CityPoint } from "@/lib/calgary";

export function DemoJobDialog({
  location,
  onClose,
  onAdd,
}: {
  location: CityPoint | null;
  onClose: () => void;
  onAdd: (job: CityJob) => void;
}) {
  const [kind, setKind] = useState<CityJob["kind"]>("volunteer");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location || !isInCalgary(location)) return;
    const data = new FormData(event.currentTarget);
    onAdd({
      ...location,
      id: crypto.randomUUID(),
      title: String(data.get("title")).trim(),
      organization: String(data.get("organization")).trim(),
      neighbourhood: "Your Calgary pin",
      kind,
      compensation:
        kind === "volunteer"
          ? "Volunteer"
          : String(data.get("compensation")).trim(),
      commitment: "To be discussed",
      skills: String(data.get("skills"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8),
      description: String(data.get("description")).trim(),
      mentorship: false,
    });
  }
  return (
    <Dialog
      open={location !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Add a demo job</DialogTitle>
          <DialogDescription>
            Visible in this tab only. Refreshing the page clears your additions.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <form id="demo-job-form" onSubmit={submit} className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Calgary pin: {location?.latitude.toFixed(4)},{" "}
              {location?.longitude.toFixed(4)}
            </p>
            <div className="space-y-2">
              <Label htmlFor="job-title">Project title</Label>
              <Input
                id="job-title"
                name="title"
                required
                minLength={3}
                maxLength={100}
                placeholder="A website for our community garden"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-organization">Posted by</Label>
              <Input
                id="job-organization"
                name="organization"
                required
                minLength={2}
                maxLength={80}
                placeholder="Your organisation or name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Project description</Label>
              <Textarea
                id="job-description"
                name="description"
                required
                minLength={20}
                maxLength={1000}
                placeholder="What would you like to build together?"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium" id="job-kind-label">
                Opportunity type
              </p>
              <div
                className="flex gap-2"
                role="group"
                aria-labelledby="job-kind-label"
              >
                {(["volunteer", "paid"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={kind === value ? "secondary" : "outline"}
                    aria-pressed={kind === value}
                    onClick={() => setKind(value)}
                  >
                    {value === "paid" ? "Paid project" : "Volunteer"}
                  </Button>
                ))}
              </div>
            </div>
            {kind === "paid" && (
              <div className="space-y-2">
                <Label htmlFor="job-compensation">Compensation</Label>
                <Input
                  id="job-compensation"
                  name="compensation"
                  required
                  maxLength={80}
                  placeholder="$1,000 project"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="job-skills">Skills, separated by commas</Label>
              <Input
                id="job-skills"
                name="skills"
                maxLength={160}
                placeholder="React, design, accessibility"
              />
            </div>
          </form>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" form="demo-job-form">
            Add job to map
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
