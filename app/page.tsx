import {
  ArrowDownIcon,
  ArrowUpRightIcon,
  CodeXmlIcon,
  CompassIcon,
  HeartHandshakeIcon,
  HeartIcon,
  SproutIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const principles = [
  {
    number: "01",
    icon: CompassIcon,
    title: "Start with shared interests.",
    description:
      "Find common ground in the causes, ideas, and problems you care about.",
  },
  {
    number: "02",
    icon: SproutIcon,
    title: "Grow through real work.",
    description:
      "Bring your curiosity, learn from each other, and build experience together.",
  },
  {
    number: "03",
    icon: HeartIcon,
    title: "Make something that matters.",
    description:
      "Put your skills and ideas to work on projects with a positive social impact.",
  },
];

export default function Home() {
  return (
    <>
      <Button
        render={<a href="#main-content" />}
        className="fixed start-4 top-4 z-50 -translate-y-24 focus-visible:translate-y-0"
      >
        Skip to content
      </Button>

      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-14">
        <header className="flex min-h-24 items-center justify-between gap-4 border-b">
          <Button
            render={<a href="/" />}
            variant="ghost"
            className="min-h-11 min-w-0 shrink gap-3 px-0 text-start text-base font-semibold tracking-tight whitespace-normal hover:bg-transparent sm:text-base"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <SproutIcon aria-hidden="true" className="size-6" />
            </span>
            <span>Build &amp; Connect</span>
          </Button>
          <nav aria-label="Main">
            <Button
              render={<a href="#the-idea" />}
              variant="ghost"
              className="min-h-11"
            >
              The idea
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
          </nav>
        </header>

        <main id="main-content" tabIndex={-1} className="outline-none">
          <section
            aria-labelledby="hero-heading"
            className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:py-24"
          >
            <div className="flex flex-col items-start gap-7">
              <Badge
                variant="outline"
                className="rounded-full px-3 py-3 text-muted-foreground"
              >
                A little purpose goes a long way
              </Badge>
              <h1
                id="hero-heading"
                className="max-w-2xl font-display text-[clamp(3.25rem,6.5vw,5.75rem)] leading-[1.04] tracking-[-0.065em] text-balance"
              >
                Build experience.{" "}
                <span className="text-primary">Make a difference.</span>
              </h1>
              <p className="max-w-md text-base leading-8 text-muted-foreground sm:text-lg">
                Connecting early-career developers with people and companies
                through shared interests and social-impact projects.
              </p>
              <Button
                render={<a href="#the-idea" />}
                size="xl"
                className="mt-1 min-h-12 px-6"
              >
                Explore the idea
                <ArrowDownIcon aria-hidden="true" />
              </Button>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none relative mx-auto flex min-h-[27rem] w-full max-w-md items-center justify-center sm:min-h-[28rem]"
            >
              <div className="absolute end-0 top-0 size-52 rounded-full bg-illustration-sun sm:size-64" />
              <div className="absolute bottom-4 start-0 size-52 rounded-t-full rounded-be-full bg-secondary sm:size-60" />
              <Card className="relative z-10 w-4/5 -rotate-6 border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/12 sm:w-80">
                <CardPanel className="flex min-h-[25rem] flex-col justify-between gap-8 p-7 sm:p-8">
                  <HeartHandshakeIcon className="size-12 stroke-[1.25]" />
                  <p className="font-display text-4xl leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                    Good ideas.
                    <br />
                    Great company.
                  </p>
                  <Separator className="bg-primary-foreground/24" />
                </CardPanel>
              </Card>
              <Card className="absolute -end-1 bottom-0 z-20 w-60 rotate-6 sm:-end-4 sm:w-64">
                <CardPanel className="flex items-center gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <CodeXmlIcon className="size-6 stroke-[1.5]" />
                  </span>
                  <p className="text-sm font-medium leading-6">
                    A new skill.
                    <br />A shared purpose.
                  </p>
                </CardPanel>
              </Card>
              <svg
                viewBox="0 0 80 80"
                className="absolute -start-2 top-8 z-20 size-20 fill-illustration-flower sm:start-0"
              >
                <path d="M40 0 48 23 68 12 57 32 80 40 57 48 68 68 48 57 40 80 32 57 12 68 23 48 0 40 23 32 12 12 32 23Z" />
              </svg>
            </div>
          </section>

          <section
            id="the-idea"
            aria-labelledby="idea-heading"
            className="border-t py-14 sm:py-20"
          >
            <div className="mb-9 flex flex-col justify-between gap-4 sm:mb-12 sm:flex-row sm:items-end">
              <h2
                id="idea-heading"
                className="max-w-md font-display text-4xl leading-tight tracking-[-0.045em] sm:text-5xl"
              >
                Different skills.
                <br />
                Shared purpose.
              </h2>
              <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                For developers finding their feet and people ready to bring an
                idea to life.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {principles.map(({ number, icon: Icon, title, description }) => (
                <Card key={number} render={<article />}>
                  <CardHeader className="gap-7">
                    <div className="flex items-center justify-between">
                      <Icon
                        aria-hidden="true"
                        className="size-7 stroke-[1.5] text-primary"
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {number}
                      </span>
                    </div>
                    <CardTitle render={<h3 />} className="text-base leading-6">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardPanel>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {description}
                    </p>
                  </CardPanel>
                </Card>
              ))}
            </div>
          </section>
        </main>

        <footer className="flex flex-col items-start justify-between gap-4 border-t py-7 text-sm sm:flex-row sm:items-center">
          <p className="text-muted-foreground">
            Small beginnings. Meaningful possibilities.
          </p>
          <Badge variant="secondary" className="rounded-full px-3 py-3">
            <span
              className="size-1.5 rounded-full bg-foreground"
              aria-hidden="true"
            />
            In development
          </Badge>
        </footer>
      </div>
    </>
  );
}
