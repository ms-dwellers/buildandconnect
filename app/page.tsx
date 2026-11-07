import Link from "next/link";
import { SiteShell } from "../components/SiteShell.tsx";

export default function Home() {
  return (
    <SiteShell>
      <p className="text-sm font-semibold tracking-wide text-emerald-800">
        Build &amp; Connect
      </p>
      <h1 className="mt-8 max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
        Local problems. Nearby developers.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-stone-700">
        Post a request on the map as a neighbor. Developers with a pin and
        radius find work nearby, ranked by growth fit.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/sign-up"
          className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-medium text-white"
        >
          Get started
        </Link>
        <Link
          href="/requests/new"
          className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium"
        >
          Post a request
        </Link>
        <Link
          href="/map"
          className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium"
        >
          Open nearby map
        </Link>
      </div>
      <section
        aria-labelledby="paths-heading"
        className="mt-12 grid gap-4 sm:grid-cols-2"
      >
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 id="paths-heading" className="text-lg font-semibold">
            Requesters
          </h2>
          <p className="mt-2 leading-7 text-stone-700">
            Drop a pin, describe the problem, and watch a nearby developer
            accept it.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Developers</h2>
          <p className="mt-2 leading-7 text-stone-700">
            Save your working area, browse open requests inside your radius, and
            claim the one you can help with.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
