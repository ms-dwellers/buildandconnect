"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMascotMotion } from "@/lib/mascot-motion";

export function MascotMotionToggle() {
  const { enabled, reducedMotion, ready, toggle } = useMascotMotion();
  const description = reducedMotion
    ? "Your device prefers reduced motion"
    : enabled
      ? "Pause mascot animations"
      : "Play mascot animations";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={
        reducedMotion
          ? "Mascot animations: reduced motion"
          : "Mascot animations"
      }
      aria-pressed={enabled}
      title={description}
      disabled={!ready || reducedMotion}
      onClick={toggle}
    >
      {enabled ? (
        <PauseIcon aria-hidden="true" />
      ) : (
        <PlayIcon aria-hidden="true" />
      )}
    </Button>
  );
}
