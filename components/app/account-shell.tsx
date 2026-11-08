import type { ReactNode } from "react";
import { AppHeader } from "./app-shell";
import { HeroScene } from "@/components/landing/hero-scene";

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
        className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 outline-none sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-12 lg:py-10"
      >
        <aside
          aria-label="Build something meaningful"
          className="relative isolate hidden min-h-[36rem] self-stretch overflow-hidden rounded-3xl bg-secondary lg:block"
        >
          <HeroScene />
          <div className="relative z-10 px-9 pt-12">
            <p className="font-display text-5xl font-bold leading-[1.05] tracking-tight">
              Build experience.
              <br />
              Make a difference.
            </p>
            <p className="mt-5 max-w-xs text-base leading-7 text-muted-foreground">
              Real community projects. People to build with. Room to grow.
            </p>
          </div>
        </aside>
        <div className="mx-auto w-full max-w-lg min-w-0">
          <div className="mb-6 space-y-3">
            <h1 className="font-display text-4xl leading-tight tracking-tight">
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
