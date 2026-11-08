"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
} from "@/components/ui/dialog";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { usePaged } from "@/lib/use-api";
import type { Interest } from "@/lib/types";
import { StartChatButton } from "./start-chat-button";

export function ConversationPicker({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon aria-hidden="true" />
        New conversation
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader className="pr-12">
          <DialogTitle>Message a project partner</DialogTitle>
          <DialogDescription>
            Start or reopen a conversation with someone you have a mutual
            project connection with.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>{open && <Connections userId={userId} />}</DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

function Connections({ userId }: { userId: string }) {
  const connections = usePaged<Interest>("/interests");
  const available = connections.items.filter((item) => item.connected);
  return (
    <div className="space-y-4">
      {connections.error && (
        <ErrorAlert
          title="Connections could not be loaded"
          message={connections.error.message}
          onRetry={() => void connections.reload()}
        />
      )}
      {connections.loading && !connections.items.length ? (
        <LoadingBlock rows={2} />
      ) : available.length ? (
        <ul className="divide-y">
          {available.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"
            >
              <div className="min-w-0 flex-1 basis-48">
                <p className="font-semibold">
                  {item.developerId === userId
                    ? item.requesterName
                    : item.developerName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.title}
                </p>
              </div>
              <StartChatButton
                opportunityId={item.opportunityId}
                developerId={item.developerId}
              />
            </li>
          ))}
        </ul>
      ) : (
        !connections.error && (
          <div className="space-y-3 py-3">
            <p className="text-sm leading-6 text-muted-foreground">
              No mutual connections yet. Express interest in a project, then
              wait for the other person to respond before starting a
              conversation.
            </p>
            <Button render={<a href="/dashboard" />} variant="outline">
              Find project connections
            </Button>
          </div>
        )
      )}
      {connections.hasMore && (
        <Button
          variant="ghost"
          loading={connections.loading}
          onClick={() => void connections.loadMore()}
        >
          More connections
        </Button>
      )}
    </div>
  );
}
