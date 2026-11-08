import { Fragment, type CSSProperties } from "react";

export function RollingText({
  text,
  animated,
}: {
  text: string;
  animated: boolean;
}) {
  let word = 0;
  return (
    <span key={text} className="voice-reply" data-animated={animated}>
      {text.split(/(\s+)/).map((part, index) => {
        if (/^\s+$/.test(part)) return <Fragment key={index}>{part}</Fragment>;
        const delay = word++ * 70;
        return (
          <span
            key={index}
            className="voice-reply-word"
            style={{ "--word-delay": `${delay}ms` } as CSSProperties}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
