import type { ReactNode } from "react";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-28 space-y-6 border-t py-10 sm:py-12"
    >
      <div className="flex items-center gap-3">
        <h2
          id={`${id}-heading`}
          className="font-display text-3xl tracking-tight sm:text-4xl"
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function DemoCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle render={<h3 />} className="text-sm">
          {title}
        </CardTitle>
      </CardHeader>
      <CardPanel className="flex min-w-0 flex-col gap-5">{children}</CardPanel>
    </Card>
  );
}
