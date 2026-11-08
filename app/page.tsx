import { ArrowRightIcon, ArrowUpRightIcon, SproutIcon } from "lucide-react";
import { AccountLinks } from "@/components/app/account-links";
import { HeroScene } from "@/components/landing/hero-scene";
import {
  JoinGardenBorder,
  JoinGardenTrees,
} from "@/components/landing/join-garden";
import { MapJourneyLink } from "@/components/map/map-journey";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="landing-paper px-3 pt-3 sm:px-8 sm:pt-8">
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      <header className="mx-auto flex min-h-24 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-t-xl bg-secondary px-5 py-5 sm:px-10">
        <a
          href="/"
          aria-label="Build & Connect home"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <SproutIcon
            aria-hidden="true"
            className="size-7 stroke-[1.5] text-primary"
          />
          Build &amp; Connect
        </a>
        <nav aria-label="Main" className="flex items-center gap-3 sm:gap-6">
          <MapJourneyLink variant="link" className="hidden px-0 sm:inline-flex">
            Nearby map
          </MapJourneyLink>
          <AccountLinks />
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <section
          aria-labelledby="hero-heading"
          className="relative isolate mx-auto min-h-[820px] max-w-7xl overflow-hidden rounded-b-xl bg-secondary pt-10 sm:min-h-[800px] sm:pt-14"
        >
          <HeroScene />
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 text-center sm:px-10">
            <h1
              id="hero-heading"
              className="font-display text-[clamp(3.25rem,8vw,6.5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-balance"
            >
              Build experience.
              <br />
              <span className="text-primary">Make a difference.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
              Good ideas need people. Find a local project, bring what you know,
              and grow something good together.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-5">
              <MapJourneyLink variant="highlight" size="lg">
                Find a project
                <ArrowRightIcon aria-hidden="true" />
              </MapJourneyLink>
              <Button
                render={<a href="/requests/new" />}
                variant="outline"
                size="lg"
              >
                Post a request
              </Button>
            </div>
          </div>
        </section>
        <section
          aria-label="Ways to get involved"
          className="mx-auto grid max-w-5xl gap-12 px-6 py-14 sm:gap-16 sm:px-10 sm:py-20 md:grid-cols-2"
        >
          <article>
            <h2 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              A little experience.
              <br />A lot to offer.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-8 text-muted-foreground">
              You don’t have to know everything to make something useful. Find
              nearby requests that fit your skills, try something new, and build
              experience that matters.
            </p>
            <MapJourneyLink variant="link" className="mt-5 px-0">
              Explore nearby projects
              <ArrowUpRightIcon aria-hidden="true" />
            </MapJourneyLink>
          </article>
          <article>
            <h2 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              You bring the idea.
              <br />
              We’ll help you connect.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-8 text-muted-foreground">
              A community group, a small business, or a problem worth solving.
              Tell us what you need and put it on the map. You don’t need to
              speak code to get started.
            </p>
            <Button
              render={<a href="/requests/new" />}
              variant="link"
              className="mt-5 px-0"
            >
              Share a request
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
          </article>
        </section>
        <section
          aria-labelledby="join-heading"
          className="mx-auto max-w-6xl px-6 pb-16 sm:px-10 sm:pb-24"
        >
          <Card className="relative overflow-hidden border-primary/15 bg-secondary/50">
            <CardPanel className="grid items-center gap-8 p-8 pb-20 sm:p-12 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
              <h2
                id="join-heading"
                className="max-w-lg font-display text-3xl leading-tight tracking-tight sm:text-4xl"
              >
                Your next chapter could
                <br className="hidden sm:block" /> start around the corner.
              </h2>
              <JoinGardenTrees />
              <Button
                render={<a href="/sign-up" />}
                variant="highlight"
                size="lg"
                className="justify-self-start lg:justify-self-end"
              >
                Get started
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </CardPanel>
            <JoinGardenBorder />
          </Card>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-5 border-t px-6 py-7 text-sm sm:px-10">
        <p className="font-medium">A little closer. A little better.</p>
        <div className="flex flex-wrap items-center gap-5">
          <Button
            render={<a href="/design-system" />}
            variant="link"
            size="sm"
            className="px-0 text-muted-foreground"
          >
            Design system
          </Button>
          <Badge variant="secondary">In development</Badge>
        </div>
      </footer>
    </div>
  );
}
