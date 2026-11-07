import { SiteShell } from "../components/SiteShell.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <SiteShell>
      <h1 className="mt-8 max-w-2xl font-display text-4xl leading-tight tracking-tight sm:text-6xl">
        Local problems. Nearby developers.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
        Post a request on the map as a neighbor. Developers with a pin and
        radius find work nearby, ranked by growth fit.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button render={<a href="/sign-up" />}>Get started</Button>
        <Button render={<a href="/requests/new" />} variant="outline">Post a request</Button>
        <Button render={<a href="/map" />} variant="outline">Open nearby map</Button>
      </div>
      <section aria-labelledby="paths-heading" className="mt-12 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle render={<h2 id="paths-heading" />}>Requesters</CardTitle></CardHeader>
          <CardPanel><p>Drop a pin, describe the problem, and watch a nearby developer accept it.</p></CardPanel>
        </Card>
        <Card>
          <CardHeader><CardTitle render={<h2 />}>Developers</CardTitle></CardHeader>
          <CardPanel><p>Save your working area, browse open requests inside your radius, and claim the one you can help with.</p></CardPanel>
        </Card>
      </section>
      <Button render={<a href="/design-system" />} variant="link" className="mt-8">Design system</Button>
    </SiteShell>
  );
}
