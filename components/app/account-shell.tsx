import type { ReactNode } from "react";
import { AppHeader } from "./app-shell";
import { Mascot } from "@/components/mascot";
import { ArrowDownIcon, SproutIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="account-surface min-h-svh bg-background">
      <a href="#account-content" className="landing-skip-link">
        Skip to account setup
      </a>
      <AppHeader />
      <main
        id="account-content"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 outline-none sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-10 lg:py-12 xl:gap-16"
      >
        <aside
          aria-label="Build something meaningful"
          className="fieldbook-board relative isolate hidden h-[39rem] self-start overflow-hidden rounded-2xl border border-primary/30 bg-secondary p-9 lg:sticky lg:top-8 lg:flex lg:flex-col"
        >
          <div className="relative z-10">
            <p className="max-w-sm font-display text-5xl font-bold leading-[1.04] tracking-tight">
              Build experience.
              <br />
              Make a difference.
            </p>
            <p className="mt-5 max-w-xs text-base leading-6">
              A little curiosity. A useful project. A good place to start.
            </p>
          </div>
          <div
            className="relative mt-10 flex flex-1 items-end gap-4"
            aria-hidden="true"
          >
            <div className="min-w-0 flex-1 pb-6">
              <Card className="field-note -rotate-2 p-5">
                <SproutIcon className="mb-3 size-5" />
                <p className="text-xl font-semibold leading-tight">
                  Something you want to learn
                </p>
              </Card>
              <ArrowDownIcon
                className="mx-auto my-4 size-7"
                strokeWidth={1.5}
              />
              <Card className="field-note rotate-1 p-5">
                <p className="text-xl font-semibold leading-tight">
                  Something your community needs
                </p>
                <p className="mt-2 text-sm">
                  Find the project that connects them.
                </p>
              </Card>
            </div>
            <Mascot
              pose="base"
              motion="loop"
              className="-me-6 -mb-3 size-32 xl:size-40"
            />
          </div>
        </aside>
        <div className="mx-auto w-full max-w-lg min-w-0">
          <div className="mb-6 space-y-3">
            <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
