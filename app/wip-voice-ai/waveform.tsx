"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { Meter } from "@/components/ui/meter";

export function Waveform({ microphone }: { microphone?: RefObject<number> }) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!microphone) {
      setLevel(0);
      return;
    }
    let frame = 0;
    let previous = 0;
    const update = (now: number) => {
      if (now - previous >= 50) {
        setLevel(microphone.current);
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
        style={{ "--mic-level": level } as CSSProperties}
      >
        {Array.from({ length: 17 }, (_, index) => (
          <span
            key={index}
            style={
              {
                "--bar": index,
                "--height": `${24 + Math.sin(index * 1.4) * 18 + Math.sin((index / 16) * Math.PI) * 65}px`,
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
