"use client";

import { useEffect, useState } from "react";
import "./hero-scene.css";

const trees = [
  { sprite: 1, left: "-3%", size: "large" },
  { sprite: 4, left: "12%", size: "large" },
  { sprite: 2, left: "23%", size: "small" },
  { sprite: 4, left: "69%", size: "small" },
  { sprite: 3, left: "79%", size: "large" },
  { sprite: 4, left: "94%", size: "large" },
] as const;

const flowers = [
  { sprite: 1, left: "3%" },
  { sprite: 3, left: "18%" },
  { sprite: 2, left: "33%" },
  { sprite: 4, left: "40%" },
  { sprite: 1, left: "57%" },
  { sprite: 2, left: "65%" },
  { sprite: 4, left: "76%" },
  { sprite: 3, left: "91%" },
] as const;

/** Decorative only: the heading and actions remain available during the reveal. */
export function HeroScene() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      void document.fonts.ready.then(() => {
        if (!cancelled) setRevealed(true);
      });
    };

    if (document.readyState === "complete") reveal();
    else window.addEventListener("load", reveal, { once: true });

    // A stalled font or image must never leave the heading covered indefinitely.
    const fallback = window.setTimeout(() => setRevealed(true), 4000);
    return () => {
      cancelled = true;
      window.removeEventListener("load", reveal);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="hero-scene" aria-hidden="true" data-revealed={revealed}>
      <div className="hero-sky-clouds">
        <img
          src="/sprites/cloud-1.svg"
          width="171"
          height="136"
          alt=""
          className="hero-sky-cloud hero-sky-cloud-one"
        />
        <img
          src="/sprites/cloud-2.svg"
          width="249"
          height="120"
          alt=""
          className="hero-sky-cloud hero-sky-cloud-two"
        />
        <img
          src="/sprites/cloud-3.svg"
          width="299"
          height="196"
          alt=""
          className="hero-sky-cloud hero-sky-cloud-three"
        />
      </div>

      <div className="hero-landscape">
        <div className="hero-water" />
        <div className="hero-ground" />
        {trees.map((tree, index) => (
          <img
            key={index}
            src={`/sprites/tree-${tree.sprite}.svg`}
            width={tree.sprite === 4 ? 60 : 129}
            height={tree.sprite === 4 ? 158 : tree.sprite === 1 ? 226 : 227}
            alt=""
            className={`hero-tree hero-tree-${tree.size}`}
            style={{ left: tree.left }}
          />
        ))}
        {[8, 27, 48, 71, 87, 97].map((left, index) => (
          <img
            key={left}
            src={`/sprites/grass-${(index % 3) + 1}.svg`}
            width={[26, 19, 31][index % 3] * 2}
            height={[20, 17, 31][index % 3] * 2}
            alt=""
            className="hero-grass"
            style={{ left: `${left}%` }}
          />
        ))}
        {flowers.map((flower, index) => (
          <img
            key={index}
            src={`/sprites/flower-${flower.sprite}.svg`}
            width={(flower.sprite === 1 ? 11 : 14) * 2}
            height={
              (flower.sprite === 1 ? 13 : flower.sprite === 3 ? 19 : 18) * 2
            }
            alt=""
            className="hero-flower"
            style={{ left: flower.left }}
          />
        ))}
      </div>

      <div className="hero-cloud-reveal">
        {["left", "right"].map((side) => (
          <div key={side} className={`hero-cloud-bank hero-cloud-bank-${side}`}>
            <img
              src="/sprites/large-cloud.svg"
              width="267"
              height="325"
              alt=""
              className="hero-curtain-cloud"
            />
            <img
              src="/sprites/foreground-cloud-3.svg"
              width="240"
              height="128"
              alt=""
              className="hero-curtain-cloud hero-curtain-cloud-low"
            />
            <img
              src="/sprites/foreground-cloud-1.svg"
              width="151"
              height="114"
              alt=""
              className="hero-curtain-cloud hero-curtain-cloud-high"
            />
          </div>
        ))}
      </div>
      <noscript>
        <style>{`.hero-cloud-reveal { display: none; }`}</style>
      </noscript>
    </div>
  );
}
