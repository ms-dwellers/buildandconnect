import {
  ArrowDownIcon,
  ArrowUpRightIcon,
  CodeXmlIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  SproutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { MapJourneyLink } from "@/components/map/map-journey";
import { CityIllustration } from "@/components/map/city-illustration";

export default function Home() {
  return (
    <>
      <Button
        render={<a href="#home-main" />}
        className="fixed start-4 top-4 z-50 -translate-y-24 focus-visible:translate-y-0"
      >
        Skip to content
      </Button>
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-14">
        <header className="flex min-h-24 flex-wrap items-center justify-between gap-4 border-b py-4">
          <Button
            render={<a href="/" />}
            variant="ghost"
            className="gap-3 px-0 text-base"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <SproutIcon aria-hidden="true" className="size-6" />
            </span>
            <span>Build &amp; Connect</span>
          </Button>
          <nav aria-label="Main" className="flex items-center gap-2 sm:gap-5">
            <Button
              render={<a href="#the-idea" />}
              variant="ghost"
              className="hidden sm:inline-flex"
            >
              The idea
            </Button>
            <MapJourneyLink variant="ghost">
              Explore Calgary
              <ArrowUpRightIcon aria-hidden="true" />
            </MapJourneyLink>
          </nav>
        </header>
        <main id="home-main" tabIndex={-1} className="outline-none">
          <section
            className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24"
            aria-labelledby="home-title"
          >
            <div className="space-y-7">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[.15em] text-primary uppercase">
                <MapPinIcon aria-hidden="true" className="size-4" />
                Starting in Calgary, Alberta
              </p>
              <h1
                id="home-title"
                className="font-display text-[clamp(3.5rem,6.4vw,5.8rem)] leading-[1.03] tracking-[-.06em]"
              >
                Good work.
                <br />
                <span className="text-primary">
                  Right around
                  <br className="hidden lg:block" /> the corner.
                </span>
              </h1>
              <p className="max-w-md text-base leading-8 text-muted-foreground sm:text-lg">
                Find meaningful projects and people to build with. A little
                real-world experience. A much more meaningful network.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <MapJourneyLink size="xl">
                  Explore Calgary
                  <ArrowUpRightIcon aria-hidden="true" />
                </MapJourneyLink>
                <Button render={<a href="#the-idea" />} variant="ghost">
                  How it comes together
                  <ArrowDownIcon aria-hidden="true" />
                </Button>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                Local possibilities. Shared purpose. A place to start.
              </p>
            </div>
            <div
              className="relative mx-auto w-full max-w-lg pb-8"
              aria-hidden="true"
            >
              <div className="absolute -end-5 -top-6 size-36 rounded-full bg-illustration-sun/75 sm:size-48" />
              <div className="absolute -start-5 bottom-0 size-40 rounded-t-full rounded-be-full bg-secondary" />
              <Card className="relative rotate-2 overflow-hidden bg-map-land">
                <div className="relative h-[23rem] sm:h-[28rem]">
                  <CityIllustration className="absolute inset-0 size-full" />
                  <span className="absolute start-[45%] top-[43%] flex size-11 -rotate-2 items-center justify-center rounded-xl border border-primary bg-primary text-primary-foreground shadow-lg">
                    <CodeXmlIcon className="size-6" />
                  </span>
                  <span className="absolute start-[72%] top-[61%] flex size-10 -rotate-2 items-center justify-center rounded-xl border border-input bg-secondary text-foreground shadow-lg">
                    <HeartHandshakeIcon className="size-5" />
                  </span>
                  <div className="absolute start-5 top-5 rounded-lg border bg-card/95 px-3 py-2 text-xs font-medium">
                    A city full of starting points.
                  </div>
                </div>
              </Card>
              <Card className="absolute -start-2 bottom-0 w-[min(20rem,90%)] -rotate-3">
                <CardPanel className="flex items-center gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <HeartHandshakeIcon className="size-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      Your next chapter is local.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calgary, meet your community.
                    </p>
                  </div>
                </CardPanel>
              </Card>
            </div>
          </section>
          <section
            id="the-idea"
            className="border-t py-14 sm:py-20"
            aria-labelledby="idea-title"
          >
            <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
              <h2
                id="idea-title"
                className="max-w-lg font-display text-4xl leading-tight tracking-tight sm:text-5xl"
              >
                Small projects.
                <br />
                Real connections.
              </h2>
              <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                Connect through something you actually build together, not
                another connection request.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: MapPinIcon,
                  title: "Find your common ground.",
                  text: "Explore projects in Calgary's neighbourhoods, from local businesses to community causes.",
                },
                {
                  icon: CodeXmlIcon,
                  title: "Build something real.",
                  text: "Bring your skills to a paid project or stretch into something new with a volunteer opportunity.",
                },
                {
                  icon: HeartHandshakeIcon,
                  title: "Grow a meaningful network.",
                  text: "Get to know the people behind the project. Shared work is a better introduction.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <Card key={title}>
                  <CardHeader className="gap-6">
                    <Icon aria-hidden="true" className="size-7 text-primary" />
                    <CardTitle render={<h3 />} className="text-base leading-6">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardPanel>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {text}
                    </p>
                  </CardPanel>
                </Card>
              ))}
            </div>
          </section>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t py-7 text-xs text-muted-foreground">
          <span>Built for a little more connection.</span>
          <div className="flex gap-5">
            <a
              href="/debug"
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Backend QA
            </a>
            <a
              href="/design-system"
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Design system
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
