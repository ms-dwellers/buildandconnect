import Link from "next/link";

export function SiteShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-950 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide text-emerald-800"
          >
            Build &amp; Connect
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-stone-700">
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up">Sign up</Link>
            <Link href="/role">Choose role</Link>
            <Link href="/requests">My requests</Link>
            <Link href="/requests/new">Post request</Link>
            <Link href="/map">Nearby map</Link>
          </nav>
        </div>
        {title ? (
          <h1 className="mt-10 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
        ) : null}
        <div className={title ? "mt-8" : "mt-10"}>{children}</div>
      </div>
    </main>
  );
}
