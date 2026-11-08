import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { AppShell } from "@/components/app/app-shell";
import { RequestScreen } from "@/components/forms/request-screen";
import { routeParam } from "@/lib/navigation";

export const metadata: Metadata = { title: pageTitle("Edit request") };

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = routeParam((await params).id);
  return (
    <AppShell title="Edit request" width="narrow">
      <RequestScreen id={id} />
    </AppShell>
  );
}
