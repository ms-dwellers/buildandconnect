import type { Metadata } from "next";
import { CalgaryExplorer } from "@/components/map/calgary-explorer";
import { first } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Explore Calgary | Build & Connect",
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
