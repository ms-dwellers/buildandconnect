"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMascotMotion } from "@/lib/mascot-motion";
import {
  MASCOT_FEEDBACK,
  MASCOT_REACTION_MS,
  type MascotFeedback,
  type MascotMotion,
  type MascotPose,
} from "@/lib/mascot-feedback";

const filenames: Record<MascotPose, string> = {
  base: "Base",
  happy: "Happy",
  crying: "Crying",
  running: "Running",
};

export function Mascot({
  pose = "base",
  animate = false,
  motion = animate ? "once" : "still",
  replayKey,
  className,
}: {
  pose?: MascotPose;
  animate?: boolean;
  motion?: MascotMotion;
  replayKey?: string | number;
  className?: string;
}) {
  const { enabled } = useMascotMotion();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!enabled || motion === "still") {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    if (motion === "once") {
      const timeout = window.setTimeout(
        () => setPlaying(false),
        MASCOT_REACTION_MS,
      );
      return () => window.clearTimeout(timeout);
    }
  }, [enabled, motion, pose, replayKey]);
  const animated = enabled && playing && motion !== "still";
  const still = `/assets/mascots/still/${pose}.gif`;
  return (
    <picture
      aria-hidden="true"
      data-mascot-pose={pose}
      data-mascot-motion={animated ? motion : "still"}
      className={cn("mascot block shrink-0", className)}
    >
      <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
      <img
        src={
          animated
            ? `/assets/mascots/Mascot_${filenames[pose]}_1000.gif`
            : still
        }
        width={160}
        height={160}
        alt=""
        draggable={false}
        className="size-full object-contain [image-rendering:pixelated]"
      />
    </picture>
  );
}

export function FeedbackMascot({
  state,
  className,
  replayKey,
}: {
  state: MascotFeedback;
  className?: string;
  replayKey?: string | number;
}) {
  return (
    <Mascot
      {...MASCOT_FEEDBACK[state]}
      className={className}
      replayKey={replayKey}
    />
  );
}

export function MascotStatus({
  state,
  children,
  className,
}: {
  state: MascotFeedback;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <FeedbackMascot state={state} className="size-12" />
      <span>{children}</span>
    </div>
  );
}
