import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { CalgaryExplorer } from "@/components/map/calgary-explorer";
import { first } from "@/lib/navigation";

export const metadata: Metadata = {
  title: pageTitle("Explore Calgary"),
  description:
    "Community requests and developer opportunities across Calgary, on one map.",
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { focus } = await searchParams;
  return <CalgaryExplorer focus={first(focus) ?? null} />;
}
