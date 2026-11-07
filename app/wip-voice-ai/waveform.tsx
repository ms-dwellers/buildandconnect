"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { Meter } from "@/components/ui/meter";
import { microphoneMotionRate } from "./voice-motion";

export function Waveform({ microphone }: { microphone?: RefObject<number> }) {
  const [{ level, phase }, setMotion] = useState({ level: 0, phase: 0 });
  useEffect(() => {
    if (!microphone) {
      setMotion({ level: 0, phase: 0 });
      return;
    }
    let frame = 0;
    let previous = 0;
    let phase = 0;
    const update = (now: number) => {
      if (!previous) previous = now;
      if (now - previous >= 50) {
        const level = microphone.current;
        phase =
          (phase +
            (Math.min(now - previous, 100) / 1000) *
              microphoneMotionRate(level) *
              Math.PI *
              2) %
          (Math.PI * 2);
        setMotion({ level, phase });
        previous = now;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [microphone]);

  return (
    <>
      <div
        className="voice-waveform"
        aria-hidden="true"
        data-reactive={Boolean(microphone)}
        data-level={level.toFixed(3)}
      >
        {Array.from({ length: 17 }, (_, index) => (
          <span
            key={index}
            style={
              {
                "--bar": index,
                "--height": `${24 + Math.sin(index * 1.4) * 18 + Math.sin((index / 16) * Math.PI) * 65}px`,
                "--mic-scale": 0.6 + Math.sin(phase + index * 0.65) * 0.35,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {microphone && (
        <Meter
          className="voice-mic-meter"
          aria-label="Microphone level"
          value={Math.round(level * 100)}
          min={0}
          max={100}
        />
      )}
    </>
  );
}
