"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function StartChatButton({
  opportunityId,
  developerId,
}: {
  opportunityId: string;
  developerId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          const result = await api<{ id: string }>("/chat/conversations", {
            method: "POST",
            body: JSON.stringify({ opportunityId, developerId }),
          });
          if (result.ok) router.push(`/messages/${result.data.id}`);
          else setError(result.error);
          setPending(false);
        }}
      >
        <MessageSquareIcon aria-hidden="true" /> Message
      </Button>
      {error && (
        <p role="alert" className="max-w-64 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
