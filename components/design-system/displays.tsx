"use client";

import {
  CheckCircle2Icon,
  FolderOpenIcon,
  InfoIcon,
  PlusIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "@/components/ui/meter";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { toastManager } from "@/components/ui/toast";
import { DemoCard, Section } from "./section";

export function Feedback() {
  const [progress, setProgress] = useState(40);
  return (
    <Section id="feedback" number="04" title="Feedback & progress">
      <div className="grid gap-4 lg:grid-cols-2">
        <DemoCard title="Alert variants">
          <Alert variant="success" role="note">
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>The example is ready.</AlertDescription>
          </Alert>
          <Alert variant="info" role="note">
            <InfoIcon aria-hidden="true" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>Changes stay in this demo.</AlertDescription>
          </Alert>
          <Alert variant="warning" role="note">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>Needs attention</AlertTitle>
            <AlertDescription>
              Review the example before continuing.
            </AlertDescription>
          </Alert>
          <Alert variant="error" role="note">
            <XCircleIcon aria-hidden="true" />
            <AlertTitle>Something needs fixing</AlertTitle>
            <AlertDescription>Check the highlighted fields.</AlertDescription>
          </Alert>
        </DemoCard>
        <DemoCard title="Progress · meter · spinner · skeleton">
          <Progress value={progress}>
            <div className="mb-3 flex justify-between gap-3 text-sm">
              <ProgressLabel>Example upload</ProgressLabel>
              <ProgressValue />
            </div>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setProgress((value) => (value >= 100 ? 0 : value + 20))
              }
            >
              {progress >= 100 ? "Reset progress" : "Advance progress"}
            </Button>
          </div>
          <Meter value={65}>
            <div className="mb-3 flex justify-between gap-3 text-sm">
              <MeterLabel>Example capacity</MeterLabel>
              <MeterValue />
            </div>
            <MeterTrack>
              <MeterIndicator />
            </MeterTrack>
          </Meter>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading example
          </div>
          <div aria-hidden="true" className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </DemoCard>
      </div>
    </Section>
  );
}

export function Navigation() {
  return (
    <Section id="navigation" number="06" title="One thing at a time">
      <div className="grid gap-4 lg:grid-cols-2">
        <DemoCard title="Tabs">
          <Tabs defaultValue="overview">
            <TabsList aria-label="Project example">
              <TabsTab value="overview">Overview</TabsTab>
              <TabsTab value="people">People</TabsTab>
              <TabsTab value="activity">Activity</TabsTab>
            </TabsList>
            <TabsPanel
              value="overview"
              className="rounded-xl bg-muted p-5 text-sm leading-7"
            >
              A shared home for an idea and the people building it.
            </TabsPanel>
            <TabsPanel
              value="people"
              className="rounded-xl bg-muted p-5 text-sm leading-7"
            >
              Good collaboration starts with shared interests.
            </TabsPanel>
            <TabsPanel
              value="activity"
              className="rounded-xl bg-muted p-5 text-sm leading-7"
            >
              This example has no activity yet.
            </TabsPanel>
          </Tabs>
        </DemoCard>
        <DemoCard title="Accordion">
          <Accordion defaultValue={["components"]}>
            <AccordionItem value="components">
              <AccordionTrigger>What powers these components?</AccordionTrigger>
              <AccordionPanel>
                coss ui provides the styled components. Base UI handles their
                accessibility and interactions.
              </AccordionPanel>
            </AccordionItem>
            <AccordionItem value="theme">
              <AccordionTrigger>Where do the colors live?</AccordionTrigger>
              <AccordionPanel>
                The semantic tokens live in app/globals.css and flow through
                every component.
              </AccordionPanel>
            </AccordionItem>
            <AccordionItem value="data">
              <AccordionTrigger>Does this page save data?</AccordionTrigger>
              <AccordionPanel>
                No. Examples use local state and reset when you reload.
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </DemoCard>
      </div>
    </Section>
  );
}

export function Content() {
  return (
    <Section id="content" number="07" title="People & projects">
      <div className="grid gap-4 lg:grid-cols-2">
        <DemoCard title="Avatar & avatar group">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="[--avatar-size:3.5rem]">
              <AvatarFallback className="bg-primary text-primary-foreground">
                JC
              </AvatarFallback>
            </Avatar>
            <Avatar className="[--avatar-size:2.75rem]">
              <AvatarFallback className="bg-secondary">AM</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>RL</AvatarFallback>
            </Avatar>
          </div>
          <AvatarGroup aria-label="Example team">
            <Avatar>
              <AvatarFallback className="bg-secondary">JC</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                AM
              </AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback className="bg-secondary">RL</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+2</AvatarGroupCount>
          </AvatarGroup>
        </DemoCard>
        <DemoCard title="Empty state">
          <Empty className="p-0 md:py-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpenIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Start with an idea worth building.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                size="sm"
                onClick={() =>
                  toastManager.add({
                    title: "Create-project example",
                    description:
                      "This component preview does not create a project.",
                  })
                }
              >
                <PlusIcon aria-hidden="true" />
                Create a project
              </Button>
            </EmptyContent>
          </Empty>
        </DemoCard>
        <DemoCard title="Table · sample projects" className="lg:col-span-2">
          <Table aria-label="Sample projects">
            <TableCaption>
              Illustrative data for this component preview.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Focus</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                {
                  name: "Community garden",
                  focus: "Environment",
                  status: "Open",
                },
                {
                  name: "Local learning hub",
                  focus: "Education",
                  status: "In progress",
                },
                {
                  name: "Neighbourhood directory",
                  focus: "Community",
                  status: "Draft",
                },
              ].map((project) => (
                <TableRow key={project.name}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.focus}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{project.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DemoCard>
      </div>
    </Section>
  );
}
