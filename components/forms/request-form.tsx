"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { toastManager } from "@/components/ui/toast";
import { MapPinPicker, type Pin } from "@/components/MapPinPicker";
import { ErrorAlert } from "@/components/app/require-role";
import { api } from "@/lib/api";
import type { RequestRecord } from "@/lib/types";
import {
  FormSection,
  TextAreaField,
  TextField,
  issuesToErrors,
} from "./form-kit";

export function RequestForm({
  initial,
  defaultPin,
}: {
  initial?: RequestRecord;
  defaultPin?: Pin | null;
}) {
  const router = useRouter();
  const [pin, setPin] = useState<Pin | null>(
    initial
      ? {
          latitude: initial.latitude,
          longitude: initial.longitude,
          place: initial.place,
        }
      : (defaultPin ?? null),
  );
  const [place, setPlace] = useState(initial?.place ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin) {
      setErrors({ latitude: "Drop a pin where help is needed." });
      return;
    }
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFailure(null);
    const result = await api<RequestRecord>(
      initial ? `/requests/${initial.id}` : "/requests",
      {
        method: initial ? "PUT" : "POST",
        body: JSON.stringify({
          title: String(data.get("title")),
          description: String(data.get("description")),
          place: place.trim() || pin.place,
          latitude: pin.latitude,
          longitude: pin.longitude,
        }),
      },
    );
    setPending(false);
    if (!result.ok) {
      setErrors(issuesToErrors(result.issues));
      setFailure(result.error);
      return;
    }
    toastManager.add({
      title: initial ? "Request updated" : "Request posted",
      description: initial
        ? undefined
        : "It's now on the map for nearby developers.",
      type: "success",
    });
    router.push("/dashboard");
  }

  return (
    <Card>
      <CardPanel className="p-6">
        <Form onSubmit={submit} errors={errors} className="space-y-8">
          <FormSection title="What do you need?">
            <TextField
              name="title"
              label="Title"
              required
              minLength={3}
              maxLength={100}
              defaultValue={initial?.title}
              placeholder="A website for our community garden"
            />
            <TextAreaField
              name="description"
              label="Description"
              description="What should it do, who is it for, and how much help do you expect to need? At least 30 characters."
              required
              minLength={30}
              maxLength={6000}
              rows={6}
              defaultValue={initial?.description}
            />
          </FormSection>
          <FormSection title="Where is help needed?">
            <MapPinPicker
              value={pin}
              onChange={(next) => {
                setPin(next);
                setErrors(({ latitude: _pin, ...rest }) => rest);
                if (next.place !== "Dropped pin" || !place)
                  setPlace(next.place);
              }}
            />
            {errors.latitude && (
              <p role="alert" className="text-sm text-destructive-foreground">
                {errors.latitude}
              </p>
            )}
            <TextField
              name="place"
              label="Place name"
              description="Shown to developers. Use a neighbourhood or landmark rather than your home address."
              required
              maxLength={100}
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Bridgeland community hall"
            />
          </FormSection>
          {failure && (
            <ErrorAlert
              title={initial ? "Request not updated" : "Request not posted"}
              message={failure}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={pending}>
              {initial ? "Save changes" : "Post request"}
            </Button>
            <Button render={<Link href="/dashboard" />} variant="ghost">
              Cancel
            </Button>
          </div>
        </Form>
      </CardPanel>
    </Card>
  );
}
