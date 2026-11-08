"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  MessageSquareIcon,
  SendIcon,
} from "lucide-react";
import { RequireRole, LoadingBlock } from "@/components/app/require-role";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useChatStream } from "@/lib/use-chat-stream";
import { cn } from "@/lib/utils";
import { withNext } from "@/lib/navigation";
import type { ChatHistory, ChatMessage, Conversation } from "@/lib/chat-types";
import { ConversationPicker } from "./conversation-picker";

export function Messages({ conversationId }: { conversationId?: string }) {
  return (
    <RequireRole>
      {({ user }) => (
        <Inbox
          key={`${user.id}:${conversationId ?? "inbox"}`}
          userId={user.id}
          conversationId={conversationId}
        />
      )}
    </RequireRole>
  );
}

function Inbox({
  userId,
  conversationId,
}: {
  userId: string;
  conversationId?: string;
}) {
  const [limit, setLimit] = useState(20);
  const { snapshot, status, error, retry } = useChatStream(
    conversationId,
    limit,
  );
  const live = status === "live" || status === "polling";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {conversationId ? (
          <Button render={<Link href="/messages" />} variant="ghost" size="sm">
            <ArrowLeftIcon aria-hidden="true" /> All conversations
          </Button>
        ) : (
          <ConversationPicker userId={userId} />
        )}
        <p role="status" className="text-sm text-muted-foreground">
          {status === "polling"
            ? "Connected · Checking for updates"
            : status === "live"
              ? "Live"
              : status === "connecting"
                ? "Connecting…"
                : status === "reconnecting"
                  ? "Reconnecting…"
                  : "Disconnected"}
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"
        >
          <p>{error}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={retry} variant="outline" size="sm">
              Reconnect
            </Button>
            <Button
              render={
                <Link
                  href={withNext(
                    "/sign-in",
                    conversationId
                      ? `/messages/${conversationId}`
                      : "/messages",
                  )}
                />
              }
              variant="ghost"
              size="sm"
            >
              Sign in again
            </Button>
          </div>
        </div>
      )}
      {!snapshot && !error ? (
        <LoadingBlock />
      ) : (
        snapshot && (
          <Card className="h-[calc(100svh-22rem)] min-h-[30rem] gap-0 overflow-hidden p-0 md:grid md:h-[calc(100svh-18rem)] md:grid-cols-[18rem_minmax(0,1fr)]">
            <aside
              aria-label="Conversations"
              className={cn(
                "flex min-h-0 min-w-0 flex-col border-b md:border-e md:border-b-0",
                conversationId && "hidden md:flex",
              )}
            >
              <h2 className="border-b px-5 py-4 font-semibold">
                Conversations
              </h2>
              {snapshot.inbox.length ? (
                <ul className="min-h-0 flex-1 overflow-y-auto">
                  {snapshot.inbox.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/messages/${item.id}`}
                        aria-current={
                          item.id === conversationId ? "page" : undefined
                        }
                        className="block space-y-1.5 border-b px-5 py-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring aria-[current=page]:bg-secondary"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">
                            {item.peerName}
                          </span>
                          {item.unread > 0 && (
                            <span className="shrink-0 text-xs font-semibold text-primary">
                              {item.unread} unread
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.lastMessage || "No messages yet"}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  No conversations yet.
                </p>
              )}
              {snapshot.hasMore && (
                <div className="p-4">
                  {limit < 200 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setLimit((value) => Math.min(200, value + 20))
                      }
                    >
                      More conversations
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Showing your 200 most recent conversations. Open older
                      conversations from the project's connections.
                    </p>
                  )}
                </div>
              )}
            </aside>
            {snapshot.conversation ? (
              <Thread
                key={snapshot.conversation.id}
                conversation={snapshot.conversation}
                userId={userId}
                live={live}
              />
            ) : (
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center",
                  snapshot.inbox.length > 0 && "hidden md:flex",
                )}
              >
                <MessageSquareIcon
                  aria-hidden="true"
                  className="size-8 text-primary"
                />
                <h2 className="text-xl font-semibold">
                  {snapshot.inbox.length
                    ? "Choose a conversation"
                    : "Connect over a project"}
                </h2>
                {!snapshot.inbox.length && (
                  <>
                    <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                      Messaging opens when you and a project partner both
                      express interest.
                    </p>
                    <Button
                      render={<Link href="/dashboard" />}
                      variant="outline"
                    >
                      View connections
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        )
      )}
    </div>
  );
}

function Thread({
  conversation,
  userId,
  live,
}: {
  conversation: Conversation;
  userId: string;
  live: boolean;
}) {
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [received, setReceived] = useState(conversation.messages);
  const [hasOlder, setHasOlder] = useState<boolean>();
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [visible, setVisible] = useState(true);
  const scroll = useRef<HTMLDivElement>(null);
  const readSequence = useRef(0);
  const messages = [
    ...new Map(
      [...older, ...received, ...conversation.messages].map((item) => [
        item.sequence,
        item,
      ]),
    ).values(),
  ].sort((a, b) => a.sequence - b.sequence);
  const latest = conversation.lastSequence;

  useEffect(() => {
    const first = conversation.messages[0]?.sequence ?? 0;
    const lastReceived = received.at(-1)?.sequence ?? 0;
    if (first > lastReceived + 1) {
      // A long disconnect can miss an entire window. Reload contiguous history.
      setOlder([]);
      setHasOlder(undefined);
      setReceived(conversation.messages);
    } else if (latest > lastReceived) {
      setReceived((previous) =>
        [
          ...new Map(
            [...previous, ...conversation.messages].map((item) => [
              item.sequence,
              item,
            ]),
          ).values(),
        ].sort((a, b) => a.sequence - b.sequence),
      );
    }
  }, [conversation.messages, latest, received]);

  useEffect(() => {
    const update = () =>
      setVisible(document.visibilityState === "visible" && document.hasFocus());
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, []);
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!atBottom || !element) return;
    const anchor = () => {
      element.scrollTop = element.scrollHeight;
    };
    anchor();
    const observer = new ResizeObserver(anchor);
    observer.observe(element);
    return () => observer.disconnect();
  }, [latest, atBottom]);
  useEffect(() => {
    if (!live || !visible || !atBottom || latest <= readSequence.current)
      return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api(`/chat/conversations/${conversation.id}/read`, {
        method: "PUT",
        body: JSON.stringify({ sequence: latest }),
        signal: controller.signal,
      }).then((result) => {
        if (result.ok)
          readSequence.current = Math.max(readSequence.current, latest);
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [conversation.id, latest, atBottom, visible, live]);

  async function loadOlder() {
    const before = messages[0]?.sequence;
    if (!before) return;
    setLoadingOlder(true);
    setHistoryError("");
    const element = scroll.current;
    const height = element?.scrollHeight ?? 0;
    const position = element?.scrollTop ?? 0;
    const result = await api<ChatHistory>(
      `/chat/conversations/${conversation.id}/messages?before=${before}`,
    );
    if (result.ok) {
      setOlder((previous) => [...result.data.messages, ...previous]);
      setHasOlder(result.data.hasMore);
      requestAnimationFrame(() => {
        if (element)
          element.scrollTop = position + element.scrollHeight - height;
      });
    } else setHistoryError(result.error);
    setLoadingOlder(false);
  }

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      aria-label={`Conversation with ${conversation.peerName}`}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{conversation.peerName}</h2>
          <p
            title={conversation.title}
            className="truncate text-sm text-muted-foreground"
          >
            {conversation.title}
          </p>
        </div>
        <Button
          render={
            <Link
              href={`/opportunities/${encodeURIComponent(conversation.opportunityId)}`}
            />
          }
          variant="ghost"
          size="sm"
        >
          Project <ArrowUpRightIcon aria-hidden="true" />
        </Button>
      </header>
      <div
        ref={scroll}
        tabIndex={0}
        aria-label="Message history"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        onScroll={(event) => {
          const el = event.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
        }}
      >
        {(hasOlder ?? conversation.hasMore) && (
          <div className="mb-5 text-center">
            <Button
              variant="ghost"
              size="sm"
              loading={loadingOlder}
              onClick={() => void loadOlder()}
            >
              Earlier messages
            </Button>
          </div>
        )}
        {historyError && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {historyError}
          </p>
        )}
        {!messages.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No messages yet. Discuss scope, timing, or a question about the
            project.
          </p>
        ) : (
          <ol
            role="log"
            aria-label="Messages"
            aria-live="polite"
            aria-relevant="additions"
            className="space-y-5"
          >
            {messages.map((item) => {
              const own = item.senderId === userId;
              return (
                <li key={item.id} className={cn("flex", own && "justify-end")}>
                  <div className="max-w-[90%] space-y-1.5 sm:max-w-[80%]">
                    <p
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap wrap-anywhere",
                        own
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {item.body}
                    </p>
                    <p
                      className={cn(
                        "text-xs text-muted-foreground",
                        own && "text-end",
                      )}
                    >
                      <span className="sr-only">
                        {own ? "You" : conversation.peerName},{" "}
                      </span>
                      <time
                        dateTime={new Date(item.sentAt).toISOString()}
                        title={new Date(item.sentAt).toLocaleString()}
                      >
                        {new Date(item.sentAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                      {own &&
                        (item.sequence <= conversation.peerReadSequence
                          ? " · Read"
                          : " · Sent")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {!atBottom && (
        <Button
          variant="ghost"
          size="sm"
          className="mx-auto my-2"
          onClick={() => setAtBottom(true)}
        >
          Jump to latest
        </Button>
      )}
      <Composer
        conversation={conversation}
        live={live}
        onSent={(message) => {
          setReceived((current) => [
            ...current.filter((item) => item.id !== message.id),
            message,
          ]);
          setAtBottom(true);
        }}
      />
    </section>
  );
}

function Composer({
  conversation,
  live,
  onSent,
}: {
  conversation: Conversation;
  live: boolean;
  onSent: (message: ChatMessage) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submission = useRef<{ body: string; clientId: string } | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const canSend = conversation.canSend && live;
  async function send() {
    const body = draft.trim();
    if (!canSend || pending || !body || body.length > 4000) return;
    if (submission.current?.body !== body)
      submission.current = { body, clientId: crypto.randomUUID() };
    setPending(true);
    setError("");
    const result = await api<ChatMessage>(
      `/chat/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify(submission.current),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (result.ok) {
      setDraft("");
      submission.current = null;
      onSent(result.data);
    } else setError(result.error);
    setPending(false);
    input.current?.focus();
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
      className="shrink-0 space-y-3 border-t p-4 sm:p-5"
    >
      {!conversation.canSend && (
        <p role="status" className="text-sm text-muted-foreground">
          Messaging is paused because this connection is no longer mutual. Your
          history is still available.
        </p>
      )}
      <Label htmlFor="chat-message">Message</Label>
      <Textarea
        ref={input}
        id="chat-message"
        value={draft}
        maxLength={4000}
        rows={3}
        disabled={!conversation.canSend || pending}
        className="[&_textarea]:max-h-36"
        aria-describedby="chat-message-limit"
        placeholder={
          conversation.canSend ? "Write a message…" : "Conversation paused"
        }
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            (event.metaKey || event.ctrlKey) &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            void send();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="chat-message-limit" className="text-xs text-muted-foreground">
          {draft.length.toLocaleString()} / 4,000 · Ctrl/⌘ + Enter to send
        </p>
        <Button
          type="submit"
          size="sm"
          loading={pending}
          disabled={!canSend || !draft.trim()}
        >
          <SendIcon aria-hidden="true" /> Send message
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error} Your draft has been kept; retry to send.
        </p>
      )}
    </form>
  );
}
