"use client";

import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  SproutIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { toastManager } from "@/components/ui/toast";
import { DemoCard, Section } from "./section";

const palette = [
  {
    name: "Soft mint",
    hex: "#CCE0D9",
    token: "--palette-mint",
    role: "Supporting surfaces",
  },
  {
    name: "Muted teal",
    hex: "#8FB3AC",
    token: "--palette-teal",
    role: "Background and water",
  },
  {
    name: "Pine",
    hex: "#174C43",
    token: "--palette-pine",
    role: "Primary and focus",
  },
  {
    name: "Emerald depths",
    hex: "#1E6348",
    token: "--palette-emerald",
    role: "Supporting green",
  },
  {
    name: "Cream",
    hex: "#F8F7DE",
    token: "--palette-cream",
    role: "Cards and clouds",
  },
  {
    name: "Wheat",
    hex: "#F6DFB3",
    token: "--palette-wheat",
    role: "Warm accent",
  },
  {
    name: "Golden apricot",
    hex: "#F0A345",
    token: "--palette-apricot",
    role: "Highlight",
  },
  {
    name: "Coral",
    hex: "#EB5757",
    token: "--palette-coral",
    role: "Call to action",
  },
];

async function copyColor(hex: string) {
  try {
    await navigator.clipboard.writeText(hex);
    toastManager.add({ title: `Copied ${hex}`, type: "success" });
  } catch {
    toastManager.add({ title: `Copy manually: ${hex}`, type: "error" });
  }
}

export function Foundations() {
  return (
    <Section id="foundations" title="A warm foundation">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {palette.map((color) => (
          <Card key={color.hex} className="overflow-hidden">
            <div
              className="h-28 border-b sm:h-32"
              style={{ backgroundColor: `var(${color.token})` }}
              aria-hidden="true"
            />
            <CardPanel className="flex flex-col gap-3 p-4">
              <div>
                <p className="text-sm font-semibold">{color.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {color.role}
                </p>
              </div>
              <div className="flex items-center justify-between gap-1">
                <code className="text-xs">{color.hex}</code>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Copy ${color.name} hex`}
                  onClick={() => copyColor(color.hex)}
                >
                  <CopyIcon aria-hidden="true" />
                </Button>
              </div>
            </CardPanel>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DemoCard title="Typography">
          <p className="font-display text-4xl tracking-tight sm:text-5xl">
            Good ideas.
            <br />
            Great company.
          </p>
          <p className="text-base leading-7">
            League Spartan for body text and bold, large headings.
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">DM Mono for labels and metadata.</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-md bg-muted px-2 py-1 text-xs">
              font-mono · 0123456789
            </code>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </div>
        </DemoCard>
        <DemoCard title="Surfaces & shape">
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-lg border bg-background px-2 py-7">
              Background
            </div>
            <div className="rounded-xl border bg-secondary px-2 py-7">
              Secondary
            </div>
            <div className="rounded-2xl border bg-primary px-2 py-7 text-primary-foreground">
              Primary
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border p-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary">
              <SproutIcon aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium">Soft edges. Clear purpose.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                12px base radius · subtle borders
              </p>
            </div>
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            Coral is decorative. Destructive controls use a darker red for
            accessible contrast.
          </p>
        </DemoCard>
      </div>
    </Section>
  );
}

export function Actions() {
  const notify = (title: string) =>
    toastManager.add({
      title,
      description: "Demo action only. Nothing was saved.",
    });
  return (
    <Section id="actions" title="Actions & labels">
      <div className="grid gap-4 lg:grid-cols-2">
        <DemoCard title="Press & release" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-5 pb-1">
            <Button
              size="xl"
              onClick={() => notify("Primary example activated")}
            >
              Start building
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
            <Button
              size="xl"
              variant="secondary"
              onClick={() => notify("Secondary example activated")}
            >
              Explore an idea
            </Button>
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            Press and hold to preview the raised edge collapsing. Release to
            bring it back.
          </p>
        </DemoCard>
        <DemoCard title="Button variants">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => notify("Primary clicked")}>
              <PlusIcon aria-hidden="true" />
              Create project
            </Button>
            <Button
              variant="secondary"
              onClick={() => notify("Secondary clicked")}
            >
              Secondary
            </Button>
            <Button variant="outline" onClick={() => notify("Outline clicked")}>
              Outline
            </Button>
            <Button variant="ghost" onClick={() => notify("Ghost clicked")}>
              Ghost
            </Button>
            <Button variant="link" render={<a href="#inputs" />}>
              Link
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="destructive"
              onClick={() => notify("Destructive example clicked")}
            >
              Delete example
            </Button>
            <Button
              variant="destructive-outline"
              onClick={() => notify("Destructive outline clicked")}
            >
              Remove example
            </Button>
          </div>
        </DemoCard>
        <DemoCard title="Sizes & states">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs" onClick={() => notify("Extra small clicked")}>
              Extra small
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => notify("Small clicked")}
            >
              Small
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => notify("Large clicked")}
            >
              Large
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Confirm example"
              onClick={() => notify("Confirmed")}
            >
              <CheckIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled>Disabled</Button>
            <Button loading>Saving</Button>
          </div>
        </DemoCard>
        <DemoCard title="Badge variants" className="lg:col-span-2">
          <div className="flex flex-wrap gap-3">
            <Badge>Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Available</Badge>
            <Badge variant="info">Information</Badge>
            <Badge variant="warning">Needs review</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="destructive">Closed</Badge>
          </div>
        </DemoCard>
      </div>
    </Section>
  );
}
