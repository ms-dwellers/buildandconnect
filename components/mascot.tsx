"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Pose = "base" | "happy" | "crying" | "running";
const filenames: Record<Pose, string> = {
  base: "Base",
  happy: "Happy",
  crying: "Crying",
  running: "Running",
};

export function Mascot({
  pose = "base",
  animate = false,
  className,
}: {
  pose?: Pose;
  animate?: boolean;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!animate) return;
    setPlaying(true);
    const timeout = window.setTimeout(() => setPlaying(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [animate]);
  const still = `/assets/mascots/still/${pose}.gif`;
  return (
    <picture
      aria-hidden="true"
      className={cn("mascot block shrink-0", className)}
    >
      <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
      <img
        src={
          animate && playing
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
