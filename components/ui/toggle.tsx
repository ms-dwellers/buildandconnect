"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { cn } from "@/lib/utils";

export const toggleVariants = cva(
  [
    "button-control button-raised relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-(--button-radius) border border-input bg-popover text-sm font-semibold text-foreground outline-none",
    "[--button-edge:var(--button-outline-edge)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--button-radius)-1px)]",
    "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:bg-accent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64",
    "data-pressed:border-(--button-primary-edge) data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:[--button-edge:var(--button-primary-edge)]",
    "[&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0",
  ],
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 min-w-10 px-3",
        lg: "h-11 min-w-11 px-4 text-base [--button-depth:4px]",
        sm: "h-9 min-w-9 px-2.5 [--button-depth:2px]",
      },
      variant: {
        default: "",
        outline: "",
      },
    },
  },
);

export function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props &
  VariantProps<typeof toggleVariants>): React.ReactElement {
  return (
    <TogglePrimitive
      className={cn(toggleVariants({ className, size, variant }))}
      data-slot="toggle"
      {...props}
    />
  );
}

export { TogglePrimitive };
