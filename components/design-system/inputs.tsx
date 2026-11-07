"use client";

import {
  BookmarkIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider, SliderValue } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupSeparator,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { DemoCard, Section } from "./section";

const interests = [
  { label: "Climate & nature", value: "climate" },
  { label: "Community", value: "community" },
  { label: "Education", value: "education" },
  { label: "Health & wellbeing", value: "health" },
];

export function Inputs() {
  const [remote, setRemote] = useState(true);
  const [formats, setFormats] = useState<string[]>(["bold"]);
  const [saved, setSaved] = useState(false);
  return (
    <Section id="inputs" number="03" title="Inputs & choices">
      <div className="grid gap-4 lg:grid-cols-2">
        <DemoCard title="Form · field · input · textarea · select">
          <Form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              toastManager.add({
                title: "Example submitted",
                description: "Nothing was saved.",
                type: "success",
              });
            }}
          >
            <Field name="projectName">
              <FieldLabel>Project name</FieldLabel>
              <Input
                name="projectName"
                autoComplete="off"
                required
                placeholder="Community garden website"
              />
              <FieldError match="valueMissing">
                Enter a project name.
              </FieldError>
            </Field>
            <Field name="interest">
              <FieldLabel>Social impact</FieldLabel>
              <Select
                name="interest"
                items={interests}
                defaultValue="community"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {interests.map((interest) => (
                    <SelectItem key={interest.value} value={interest.value}>
                      {interest.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <FieldDescription>
                Choose one area for this example.
              </FieldDescription>
            </Field>
            <Field name="summary">
              <FieldLabel>Project summary</FieldLabel>
              <Textarea
                name="summary"
                placeholder="What would you like to build?"
              />
            </Field>
            <div>
              <Button type="submit">Submit example</Button>
            </div>
          </Form>
        </DemoCard>
        <DemoCard title="Control states">
          <Field invalid>
            <FieldLabel>Project URL</FieldLabel>
            <Input defaultValue="not-a-url" aria-invalid="true" />
            <FieldError match>
              Enter a complete URL, such as https://example.com.
            </FieldError>
          </Field>
          <Field disabled>
            <FieldLabel>Disabled input</FieldLabel>
            <Input value="Not editable" disabled readOnly />
          </Field>
          <Field>
            <FieldLabel>Read-only input</FieldLabel>
            <Input value="buildandconnect" readOnly />
          </Field>
          <Fieldset className="flex flex-col gap-3">
            <FieldsetLegend>Project preferences</FieldsetLegend>
            <Label>
              <Checkbox defaultChecked />
              Open to volunteering
            </Label>
            <Label>
              <Checkbox />
              Mentorship available
            </Label>
            <Label>
              <Checkbox disabled />
              Unavailable option
            </Label>
          </Fieldset>
        </DemoCard>
        <DemoCard title="Radio group & switch">
          <Fieldset className="flex flex-col gap-3">
            <FieldsetLegend>Collaboration style</FieldsetLegend>
            <RadioGroup defaultValue="async" aria-label="Collaboration style">
              <Label>
                <Radio value="async" />
                Async
              </Label>
              <Label>
                <Radio value="live" />
                Live sessions
              </Label>
              <Label>
                <Radio value="flexible" />
                Flexible
              </Label>
            </RadioGroup>
          </Fieldset>
          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <Label htmlFor="remote-demo">Remote projects</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {remote ? "Included in this example" : "Hidden in this example"}
              </p>
            </div>
            <Switch
              id="remote-demo"
              checked={remote}
              onCheckedChange={setRemote}
            />
          </div>
          <Field>
            <Slider
              defaultValue={8}
              min={0}
              max={20}
              step={1}
              getAriaLabel={() => "Weekly hours"}
            >
              <div className="mb-4 flex justify-between gap-4">
                <FieldLabel>Weekly hours</FieldLabel>
                <SliderValue />
              </div>
            </Slider>
          </Field>
        </DemoCard>
        <DemoCard title="Toggle & toggle group">
          <div>
            <Toggle
              variant="outline"
              pressed={saved}
              onPressedChange={setSaved}
              aria-label="Bookmark example"
            >
              <BookmarkIcon aria-hidden="true" />
              {saved ? "Bookmarked" : "Bookmark"}
            </Toggle>
          </div>
          <ToggleGroup
            multiple
            variant="outline"
            value={formats}
            onValueChange={setFormats}
            aria-label="Text formatting"
          >
            <ToggleGroupItem value="bold" aria-label="Bold">
              <BoldIcon aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupSeparator />
            <ToggleGroupItem value="italic" aria-label="Italic">
              <ItalicIcon aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupSeparator />
            <ToggleGroupItem value="underline" aria-label="Underline">
              <UnderlineIcon aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>
          <p
            className={cn(
              "rounded-xl bg-secondary p-5 text-lg",
              formats.includes("bold") && "font-bold",
              formats.includes("italic") && "italic",
              formats.includes("underline") && "underline",
            )}
          >
            Better when we build together.
          </p>
        </DemoCard>
      </div>
    </Section>
  );
}
