"use client";

import Link from "next/link";
import { ArrowLeftIcon, ArrowUpRightIcon } from "lucide-react";
import { AppHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Content, Feedback, Navigation } from "./displays";
import { Actions, Foundations } from "./foundations";
import { Inputs } from "./inputs";
import { Overlays } from "./overlays";

const sections = [
  ["foundations", "Foundation"],
  ["actions", "Actions & labels"],
  ["inputs", "Inputs & choices"],
  ["feedback", "Feedback"],
  ["overlays", "Overlays"],
  ["navigation", "Navigation"],
  ["content", "Content"],
];

export function DesignSystem() {
  return (
    <ToastProvider>
      <AnchoredToastProvider>
        <TooltipProvider>
          <Button
            render={<Link href="#design-content" />}
            className="fixed start-4 top-4 z-50 -translate-y-24 focus-visible:translate-y-0"
          >
            Skip to content
          </Button>
          <AppHeader
            variant="tool"
            label="Design system"
            className="sticky top-0 z-30"
            actions={
              <Button
                render={
                  <a
                    href="https://coss.com/ui/docs"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                variant="outline"
                size="sm"
              >
                coss ui docs
                <ArrowUpRightIcon aria-hidden="true" />
              </Button>
            }
          />
          <div className="mx-auto grid w-full max-w-screen-2xl gap-8 px-5 sm:px-8 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12">
            <aside className="pt-8 lg:sticky lg:top-24 lg:h-fit lg:pt-12">
              <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Component library
              </p>
              <nav
                aria-label="Design system sections"
                className="flex flex-wrap gap-1 lg:flex-col lg:items-stretch"
              >
                {sections.map(([id, title]) => (
                  <Button
                    key={id}
                    render={<Link href={`#${id}`} />}
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                  >
                    {title}
                  </Button>
                ))}
              </nav>
              <Separator className="my-5 hidden lg:block" />
              <p className="hidden text-xs leading-6 text-muted-foreground lg:block">
                React · Base UI
                <br />
                Tailwind CSS · coss ui
              </p>
            </aside>
            <main
              id="design-content"
              tabIndex={-1}
              className="min-w-0 pt-3 pb-10 outline-none lg:pt-12"
            >
              <div className="flex flex-col items-start gap-5 pb-10 sm:pb-14">
                <h1 className="font-display text-5xl tracking-[-0.055em] sm:text-7xl">
                  Made to build together.
                </h1>
                <p className="max-w-xl text-base leading-8 text-muted-foreground">
                  Our colors, type, and components, all in one place.
                  Interactive examples use local state only; nothing is saved.
                </p>
                <Button
                  render={<Link href="/" />}
                  variant="link"
                  className="px-0"
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  Back to the app
                </Button>
              </div>
              <Foundations />
              <Actions />
              <Inputs />
              <Feedback />
              <Overlays />
              <Navigation />
              <Content />
              <footer className="border-t pt-6 text-xs text-muted-foreground">
                Build &amp; Connect · Design system · Light theme
              </footer>
            </main>
          </div>
        </TooltipProvider>
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
