import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { Messages } from "@/components/chat/messages";
import { pageTitle } from "@/lib/page-title";
import { routeParam } from "@/lib/navigation";

export const metadata: Metadata = { title: pageTitle("Messages") };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = routeParam((await params).id);
  return (
    <AppShell title="Messages">
      <Messages conversationId={id} />
    </AppShell>
  );
}
