import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { DesignSystem } from "@/components/design-system/gallery";

export const metadata: Metadata = {
  title: pageTitle("Design system"),
  description:
    "The Build & Connect palette, typography, and interactive coss-ui component reference.",
};

export default function DesignSystemPage() {
  return <DesignSystem />;
}
