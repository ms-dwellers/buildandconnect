import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { AppShell } from "@/components/app/app-shell";
import { RequestScreen } from "@/components/forms/request-screen";
import { pinFromParams } from "@/lib/pin-params";

export const metadata: Metadata = {
  title: pageTitle("Post a community request"),
};

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AppShell
      title="Post a community request"
      description="Developers nearby see open requests on the map and can offer to help."
      width="narrow"
    >
      <RequestScreen defaultPin={pinFromParams(await searchParams)} />
    </AppShell>
  );
}
