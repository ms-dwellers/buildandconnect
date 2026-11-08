import Link from "next/link";
import { ArrowUpRightIcon, ArrowRightIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { AccountLinks } from "@/components/app/account-links";
import { HomeScene } from "@/components/landing/home-scene";
import { MapJourneyLink } from "@/components/map/map-journey";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { homeCopy } from "@/lib/home-copy";

export default function Home() {
  const [headingStart, headingEnd] = homeCopy.heading;
  const [forDevelopers, forPartners] = homeCopy.ways;
  return (
    <div>
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      <header className="flex h-24 items-center justify-between gap-3 px-5 sm:px-10 lg:px-16">
        <Link
          href="/"
          aria-label="Build & Connect home"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BrandLogo />
          <span className="hidden min-[420px]:inline">Build &amp; Connect</span>
        </Link>
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
          className="landing-hero relative isolate w-full overflow-hidden bg-background px-5 sm:px-10"
        >
          <div className="landing-hero-copy mx-auto flex max-w-3xl flex-col items-center text-center">
            <h1
              id="hero-heading"
              className="landing-hero-heading font-display font-bold leading-[0.98] tracking-[-0.045em] text-balance"
            >
              {headingStart}
              <br />
              <span className="text-primary">{headingEnd}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {homeCopy.lead}
            </p>
          </div>
          <HomeScene />
        </section>
        <section
          aria-label="Ways to get involved"
          className="mx-auto grid max-w-5xl gap-12 px-6 py-14 sm:gap-16 sm:px-10 sm:py-20 md:grid-cols-2"
        >
          <article>
            <h2 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              {forDevelopers.heading[0]}
              <br />
              {forDevelopers.heading[1]}
            </h2>
            <p className="mt-5 max-w-sm text-base leading-8 text-muted-foreground">
              {forDevelopers.body}
            </p>
            <MapJourneyLink variant="link" className="mt-5 px-0">
              {forDevelopers.link}
              <ArrowUpRightIcon aria-hidden="true" />
            </MapJourneyLink>
          </article>
          <article>
            <h2 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              {forPartners.heading[0]}
              <br />
              {forPartners.heading[1]}
            </h2>
            <p className="mt-5 max-w-sm text-base leading-8 text-muted-foreground">
              {forPartners.body}
            </p>
            <Button
              render={<Link href={homeCopy.ctas.post.href} />}
              variant="link"
              className="mt-5 px-0"
            >
              {forPartners.link}
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
          </article>
        </section>
        <section
          aria-labelledby="join-heading"
          className="mx-auto max-w-6xl px-6 pb-16 sm:px-10 sm:pb-24"
        >
          <Card className="border-primary/15 bg-secondary/40">
            <CardPanel className="flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
              <h2
                id="join-heading"
                className="max-w-lg font-display text-3xl leading-tight tracking-tight sm:text-4xl"
              >
                {homeCopy.join}
              </h2>
              <Button
                render={<Link href="/sign-up" />}
                variant="highlight"
                size="lg"
                className="shrink-0 self-start sm:self-auto"
              >
                Get started
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </CardPanel>
          </Card>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-5 border-t px-6 py-7 text-sm sm:px-10">
        <p className="font-medium">Build skills. Make a difference.</p>
      </footer>
    </div>
  );
}
