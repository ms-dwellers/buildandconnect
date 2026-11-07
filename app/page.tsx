export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-950 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-emerald-800">
          Build &amp; Connect
        </p>
        <h1 className="mt-8 max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          Build experience. Make a difference.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-stone-700">
          Connecting early-career developers with people and companies through
          shared interests and social-impact projects.
        </p>
        <section
          aria-labelledby="status-heading"
          className="mt-12 rounded-2xl border border-stone-200 bg-white p-6"
        >
          <h2 id="status-heading" className="text-lg font-semibold">
            In development
          </h2>
          <p className="mt-2 leading-7 text-stone-700">
            Project discovery, developer profiles, and collaboration are not
            available yet.
          </p>
        </section>
      </div>
    </main>
  );
}
