"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export const buttonVariants = cva(
  [
    "button-control relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-(--button-radius) border text-sm font-semibold outline-none",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--button-radius)-1px)]",
    "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-64 data-loading:select-none data-loading:text-transparent",
    "[&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0",
  ],
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 px-4",
        icon: "size-10",
        "icon-lg": "size-11 [--button-depth:4px]",
        "icon-sm": "size-9 [--button-depth:2px]",
        "icon-xl":
          "size-12 [--button-depth:4px] [&_svg:not([class*='size-'])]:size-5",
        "icon-xs":
          "size-7 [--button-depth:2px] [--button-radius:6px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-base [--button-depth:4px]",
        sm: "h-9 gap-1.5 px-3 [--button-depth:2px]",
        xl: "h-12 px-6 text-base [--button-depth:4px] [&_svg:not([class*='size-'])]:size-5",
        xs: "h-7 gap-1.5 px-2.5 text-xs [--button-depth:2px] [--button-radius:6px] [&_svg:not([class*='size-'])]:size-3.5",
      },
      variant: {
        default:
          "border-(--button-primary-edge) bg-primary text-primary-foreground hover:bg-(--button-primary-hover) [--button-edge:var(--button-primary-edge)] *:data-[slot=button-loading-indicator]:text-primary-foreground",
        destructive:
          "border-(--button-destructive-edge) bg-destructive text-white hover:bg-destructive/90 [--button-edge:var(--button-destructive-edge)] *:data-[slot=button-loading-indicator]:text-white",
        "destructive-outline":
          "border-destructive bg-popover text-destructive-foreground hover:bg-destructive/4 [--button-edge:var(--button-destructive-edge)] *:data-[slot=button-loading-indicator]:text-destructive-foreground",
        ghost:
          "border-transparent text-foreground hover:bg-accent data-pressed:bg-accent *:data-[slot=button-loading-indicator]:text-foreground",
        link: "border-transparent text-foreground underline-offset-4 hover:underline data-pressed:underline *:data-[slot=button-loading-indicator]:text-foreground",
        outline:
          "border-input bg-popover text-foreground hover:bg-accent/50 [--button-edge:var(--button-outline-edge)] *:data-[slot=button-loading-indicator]:text-foreground",
        secondary:
          "border-(--button-secondary-edge) bg-secondary text-secondary-foreground hover:bg-secondary/90 [--button-edge:var(--button-secondary-edge)] *:data-[slot=button-loading-indicator]:text-secondary-foreground",
      },
    },
    compoundVariants: [
      {
        variant: [
          "default",
          "secondary",
          "outline",
          "destructive",
          "destructive-outline",
        ],
        className:
          "button-raised shadow-[0_var(--button-shadow-depth)_0_0_var(--button-edge)]",
      },
    ],
  },
);

export interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  render,
  children,
  loading = false,
  disabled: disabledProp,
  ...props
}: ButtonProps): React.ReactElement {
  const [keyboardPressed, setKeyboardPressed] = useState(false);
  const isDisabled: boolean = Boolean(loading || disabledProp);
  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] =
    render ? undefined : "button";

  const defaultProps = {
    children: (
      <>
        {children}
        {loading && (
          <Spinner
            className="pointer-events-none absolute"
            data-slot="button-loading-indicator"
          />
        )}
      </>
    ),
    className: cn(buttonVariants({ className, size, variant })),
    "aria-disabled": loading || undefined,
    "data-loading": loading ? "" : undefined,
    "data-keyboard-pressed": keyboardPressed ? "" : undefined,
    "data-slot": "button",
    disabled: isDisabled,
    type: typeValue,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      const tag = event.currentTarget.tagName;
      const activates =
        (event.key === "Enter" && (tag === "BUTTON" || tag === "A")) ||
        (event.key === " " && tag === "BUTTON");
      if (!isDisabled && !event.defaultPrevented && activates) {
        setKeyboardPressed(true);
      }
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        setKeyboardPressed(false);
      }
    },
    onBlur: () => setKeyboardPressed(false),
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  });
}
