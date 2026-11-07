import type { Metadata } from "next";
import { CalgaryExplorer } from "@/components/map/calgary-explorer";

export const metadata: Metadata = {
  title: "Explore Calgary | Build & Connect",
  description:
    "Explore a frontend preview of local projects and opportunities across Calgary.",
};

export default function MapPage() {
  return <CalgaryExplorer />;
}
