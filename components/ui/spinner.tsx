import { Loader2Icon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

/** Eight ring cells for the Developer pixel buffer (N → NW, clockwise). */
const PIXEL_RING = [
  [3, 0],
  [5, 1],
  [6, 3],
  [5, 5],
  [3, 6],
  [1, 5],
  [0, 3],
  [1, 1],
] as const;

export function Spinner({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span
      aria-label="Loading"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center text-current",
        className,
      )}
      data-slot="spinner"
      role="status"
      {...props}
    >
      <Loader2Icon
        aria-hidden="true"
        className="animate-spin size-full"
        data-slot="spinner-lucide"
      />
      <svg
        aria-hidden="true"
        className="size-full"
        data-slot="spinner-pixel"
        fill="currentColor"
        viewBox="0 0 8 8"
      >
        {PIXEL_RING.map(([x, y], index) => (
          <rect
            height="2"
            key={`${x}-${y}`}
            style={{ animationDelay: `${index * 0.1}s` }}
            width="2"
            x={x}
            y={y}
          />
        ))}
      </svg>
    </span>
  );
}
