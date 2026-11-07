import type { Metadata } from "next";
import { DesignSystem } from "@/components/design-system/gallery";

export const metadata: Metadata = {
  title: "Design system · Build & Connect",
  description:
    "The Build & Connect palette, typography, and interactive coss-ui component reference.",
};

export default function DesignSystemPage() {
  return <DesignSystem />;
}
