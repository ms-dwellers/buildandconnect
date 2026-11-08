"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toastManager } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { RequestRecord } from "@/lib/types";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import type { ApiFailure } from "@/lib/use-api";

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id={id} className="text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ItemCard({ children }: { children: ReactNode }) {
  return (
    <Card className="h-full">
      <CardPanel className="flex flex-wrap items-start justify-between gap-5 p-6 [overflow-wrap:anywhere]">
        {children}
      </CardPanel>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Empty className="rounded-xl border border-dashed py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={3}>
          {title}
        </EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

/** Loading, error, empty, and populated states for a list in one place. */
export function ListState<T>({
  items,
  loading,
  error,
  onRetry,
  empty,
  hasMore,
  onLoadMore,
  layout = "list",
  children,
}: {
  items: T[];
  loading: boolean;
  error: ApiFailure | null;
  onRetry: () => void;
  empty: ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => void;
  layout?: "list" | "grid" | "rows";
  children: (item: T) => ReactNode;
}) {
  if (error && !items.length)
    return (
      <ErrorAlert
        title="This list could not be loaded"
        message={error.message}
        onRetry={onRetry}
      />
    );
  if (loading && !items.length) return <LoadingBlock rows={2} />;
  if (!items.length) return <>{empty}</>;
  return (
    <div className="space-y-3">
      {error && (
        <ErrorAlert
          title="The list could not be refreshed"
          message={error.message}
          onRetry={onRetry}
        />
      )}
      {layout === "rows" ? (
        <Card render={<ul />} className="divide-y overflow-hidden">
          {items.map(children)}
        </Card>
      ) : (
        <ul
          className={
            layout === "grid" ? "grid gap-5 sm:grid-cols-2" : "space-y-4"
          }
        >
          {items.map(children)}
        </ul>
      )}
      {hasMore && onLoadMore && (
        <Button variant="outline" loading={loading} onClick={onLoadMore}>
          Load more
        </Button>
      )}
    </div>
  );
}

export function RequestStatusBadge({
  status,
}: {
  status: RequestRecord["status"];
}) {
  if (status === "open") return <Badge variant="success">Open</Badge>;
  if (status === "claimed") return <Badge variant="info">Accepted</Badge>;
  return <Badge variant="outline">Closed</Badge>;
}

export function OpportunityStatusBadge({
  status,
}: {
  status: "open" | "closed";
}) {
  return status === "open" ? (
    <Badge variant="success">Open</Badge>
  ) : (
    <Badge variant="outline">Closed</Badge>
  );
}

/**
 * Runs one mutating API call at a time per key, then reports the outcome in a
 * toast. Returns whether it succeeded so callers can refresh their lists.
 */
export function useMutation() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const run = useCallback(
    async (
      key: string,
      path: string,
      init: RequestInit,
      success: string,
    ): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setPending(key);
      setError(null);
      try {
        const result = await api(path, init);
        if (result.ok) toastManager.add({ title: success, type: "success" });
        else {
          setError(result.error);
          toastManager.add({
            title: "Action not completed",
            description: result.error,
            type: "error",
          });
        }
        return result.ok;
      } catch {
        const message = "Check your connection and try again.";
        setError(message);
        toastManager.add({
          title: "Action not completed",
          description: message,
          type: "error",
        });
        return false;
      } finally {
        busy.current = false;
        setPending(null);
      }
    },
    [],
  );
  return { pending, run, error };
}

export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  confirmVariant = "destructive",
  ...props
}: Omit<ButtonProps, "onClick"> & {
  label: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  confirmVariant?: ButtonProps["variant"];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button {...props} />}>{label}</DialogTrigger>
      <DialogPopup showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose
            render={<Button variant={confirmVariant} onClick={onConfirm} />}
          >
            {confirmLabel}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
