"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { MapPinPicker, type Pin } from "@/components/MapPinPicker";
import { ErrorAlert } from "@/components/app/require-role";
import { api } from "@/lib/api";
import type { OpportunityInput, OpportunityRecord } from "@/lib/types";
import type { OpportunityDraft } from "@/lib/opportunity-draft";
import {
  emptyProjectDraft,
  type ProjectDraftContent,
} from "@/backend/project-drafts";
import {
  FormSection,
  TextAreaField,
  TextField,
  issuesToErrors,
  parseList,
} from "./form-kit";

type Choice<T extends string> = { value: T; label: string };

export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  choices,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  choices: Choice<T>[];
}) {
  const id = `choice-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="space-y-2.5">
      <p id={id} className="text-sm font-medium">
        {label}
      </p>
      <RadioGroup
        aria-labelledby={id}
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="flex flex-wrap gap-x-6 gap-y-3"
      >
        {choices.map((choice) => (
          <Label key={choice.value} className="font-normal">
            <Radio value={choice.value} />
            {choice.label}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

export function OpportunityForm({
  initial,
  defaultPin,
  draft,
  onSubmitted,
  onCancel,
  draftContent,
  onDraftChange,
  onPublish,
  actions,
  busy = false,
  validationErrors,
}: {
  initial?: OpportunityRecord;
  defaultPin?: Pin | null;
  draft?: OpportunityDraft;
  onSubmitted?: () => void;
  onCancel?: () => void;
  draftContent?: ProjectDraftContent;
  onDraftChange?: (content: ProjectDraftContent) => void;
  onPublish?: (content: ProjectDraftContent) => Promise<void>;
  actions?: ReactNode;
  busy?: boolean;
  validationErrors?: Record<string, string>;
}) {
  const router = useRouter();
  const values = initial ?? draft;
  const [kind, setKind] = useState<OpportunityInput["kind"] | "">(
    draftContent?.kind ?? values?.kind ?? (draft ? "" : "volunteer"),
  );
  const [collaboration, setCollaboration] = useState<
    OpportunityInput["collaboration"]
  >(draftContent?.collaboration ?? values?.collaboration ?? "flexible");
  const [remote, setRemote] = useState(
    draftContent?.remote ?? values?.remote ?? false,
  );
  const [pin, setPin] = useState<Pin | null>(
    draftContent
      ? draftContent.pin
      : initial?.latitude !== undefined && initial.longitude !== undefined
        ? {
            latitude: initial.latitude,
            longitude: initial.longitude,
            place: initial.place ?? initial.city,
          }
        : (defaultPin ?? null),
  );
  const [place, setPlace] = useState(
    draftContent?.place ?? initial?.place ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastContent = useRef(draftContent ?? emptyProjectDraft());
  function snapshot(): ProjectDraftContent {
    const data = new FormData(formRef.current!);
    const text = (name: keyof ProjectDraftContent) =>
      String(data.get(name) ?? lastContent.current[name] ?? "");
    const content = {
      title: text("title"),
      description: text("description"),
      city: text("city"),
      kind,
      remote,
      collaboration,
      essentialTechnologies: text("essentialTechnologies"),
      interests: text("interests"),
      minimumWeeklyHours: text("minimumWeeklyHours"),
      compensation: text("compensation"),
      commitment: text("commitment"),
      place,
      pin,
    };
    lastContent.current = content;
    return content;
  }
  useEffect(() => {
    if (formRef.current) onDraftChange?.(snapshot());
  }, [kind, remote, collaboration, place, pin, onDraftChange]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || busy) return;
    if (onPublish) {
      await onPublish(snapshot());
      return;
    }
    if (!kind) {
      setFailure("Choose whether this opportunity is paid or volunteer.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const optional = (name: string) => {
      const value = String(data.get(name) ?? "").trim();
      return value ? value : undefined;
    };
    const body: OpportunityInput = {
      title: String(data.get("title")),
      description: String(data.get("description")),
      city: String(data.get("city")),
      remote,
      kind,
      essentialTechnologies: parseList(data.get("essentialTechnologies")),
      minimumWeeklyHours: Number(data.get("minimumWeeklyHours")),
      collaboration,
      interests: parseList(data.get("interests")),
      compensation: kind === "paid" ? optional("compensation") : undefined,
      commitment: optional("commitment"),
      ...(pin && {
        place: place.trim() || pin.place,
        latitude: pin.latitude,
        longitude: pin.longitude,
      }),
    };
    setPending(true);
    setFailure(null);
    const result = await api<OpportunityRecord>(
      initial ? `/opportunities/${initial.id}` : "/opportunities",
      { method: initial ? "PUT" : "POST", body: JSON.stringify(body) },
    );
    setPending(false);
    if (!result.ok) {
      setErrors(issuesToErrors(result.issues));
      setFailure(result.error);
      return;
    }
    toastManager.add({
      title: initial ? "Opportunity updated" : "Opportunity posted",
      type: "success",
    });
    onSubmitted?.();
    router.push(`/opportunities/${result.data.id}`);
  }

  return (
    <Card>
      <CardPanel className="p-6">
        <Form
          ref={formRef}
          onSubmit={submit}
          onInput={() => onDraftChange?.(snapshot())}
          errors={validationErrors ?? errors}
          className="space-y-10"
        >
          <fieldset disabled={pending || busy} className="space-y-10">
            <FormSection title="The project">
              <TextField
                name="title"
                label="Title"
                required
                maxLength={100}
                defaultValue={draftContent?.title ?? values?.title}
                placeholder="An events calendar for our community centre"
              />
              <TextAreaField
                name="description"
                label="Description"
                description="Describe the work, the technologies involved, and any mentorship you offer. At least 30 characters."
                required
                minLength={30}
                maxLength={6000}
                rows={7}
                defaultValue={draftContent?.description ?? values?.description}
              />
              <ChoiceGroup
                label="Opportunity type"
                value={kind}
                onChange={setKind}
                choices={[
                  { value: "volunteer", label: "Volunteer" },
                  { value: "paid", label: "Paid" },
                ]}
              />
              <div className="grid w-full gap-5 sm:grid-cols-2">
                {kind === "paid" && (
                  <TextField
                    name="compensation"
                    label="Compensation"
                    maxLength={80}
                    defaultValue={
                      lastContent.current.compensation ||
                      draftContent?.compensation ||
                      values?.compensation
                    }
                    placeholder="$1,200 project"
                  />
                )}
                <TextField
                  name="commitment"
                  label="Expected commitment"
                  maxLength={80}
                  defaultValue={draftContent?.commitment ?? values?.commitment}
                  placeholder="3-4 weeks"
                />
              </div>
            </FormSection>

            <FormSection title="Who it suits">
              <TextField
                name="essentialTechnologies"
                label="Essential technologies"
                description="Only list true requirements, separated by commas. Developers without them won't be matched."
                defaultValue={
                  draftContent?.essentialTechnologies ??
                  values?.essentialTechnologies?.join(", ")
                }
                placeholder="React"
              />
              <TextField
                name="interests"
                label="Causes and interests"
                description="Separated by commas. Shared interests improve the match."
                defaultValue={
                  draftContent?.interests ?? values?.interests?.join(", ")
                }
                placeholder="community, sustainability"
              />
              <TextField
                name="minimumWeeklyHours"
                label="Minimum hours per week"
                type="number"
                required
                min={1}
                max={80}
                defaultValue={
                  draftContent?.minimumWeeklyHours ??
                  values?.minimumWeeklyHours ??
                  (draft ? "" : 4)
                }
                className="w-full sm:max-w-48"
              />
              <ChoiceGroup
                label="Collaboration style"
                value={collaboration}
                onChange={setCollaboration}
                choices={[
                  { value: "flexible", label: "Flexible" },
                  { value: "async", label: "Mostly async" },
                  { value: "sync", label: "Live sessions" },
                ]}
              />
            </FormSection>

            <FormSection title="Location">
              <div className="flex items-center gap-3">
                <Switch
                  id="opportunity-remote"
                  checked={remote}
                  onCheckedChange={setRemote}
                />
                <Label htmlFor="opportunity-remote">
                  Open to remote developers
                </Label>
              </div>
              <TextField
                name="city"
                label="City"
                required
                maxLength={100}
                defaultValue={
                  draftContent?.city ?? values?.city ?? (draft ? "" : "Calgary")
                }
                description={
                  remote
                    ? undefined
                    : "Only developers in this city are matched to in-person opportunities."
                }
              />
              <div className="w-full space-y-3">
                <p className="text-sm font-medium">Map pin</p>
                <p className="text-xs text-muted-foreground">
                  Optional. Add a pin to show this opportunity on the Calgary
                  map.
                </p>
                <MapPinPicker
                  value={pin}
                  onChange={(next) => {
                    setPin(next);
                    if (next.place !== "Dropped pin" || !place)
                      setPlace(next.place);
                  }}
                />
                {pin && (
                  <div className="flex flex-wrap items-end gap-3">
                    <TextField
                      name="place"
                      label="Place name"
                      required
                      maxLength={100}
                      value={place}
                      onChange={(event) => setPlace(event.target.value)}
                      className="min-w-60 flex-1"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPin(null);
                        setPlace("");
                      }}
                    >
                      Remove pin
                    </Button>
                  </div>
                )}
                {errors.latitude && (
                  <p
                    role="alert"
                    className="text-sm text-destructive-foreground"
                  >
                    {errors.latitude}
                  </p>
                )}
              </div>
            </FormSection>

            {failure && (
              <ErrorAlert
                title={
                  initial ? "Opportunity not updated" : "Opportunity not posted"
                }
                message={failure}
              />
            )}
            {actions ?? (
              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={pending}>
                  {initial ? "Save changes" : "Post opportunity"}
                </Button>
                <Button
                  render={<a href="/dashboard" />}
                  variant="ghost"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              </div>
            )}
          </fieldset>
        </Form>
      </CardPanel>
    </Card>
  );
}
