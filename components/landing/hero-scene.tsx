"use client";

import { type CSSProperties, useState } from "react";
import { Button } from "@/components/ui/button";
import { landingClouds } from "@/lib/landing-clouds";
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

export function HeroScene() {
  const [paused, setPaused] = useState(false);

  return (
    <>
      <div className="hero-scene" aria-hidden="true" data-paused={paused}>
        <div className="hero-sky-clouds">
          {landingClouds.map((cloud) => (
            <div
              key={cloud.id}
              className="hero-cloud-track"
              data-direction={cloud.direction}
              style={
                {
                  "--cloud-width": `${cloud.width}px`,
                  "--cloud-rest-left": `${(Math.abs(cloud.delay) / cloud.seconds) * 100}%`,
                  top: cloud.top,
                  animationDuration: `${cloud.seconds}s`,
                  animationDelay: `${cloud.delay}s`,
                } as CSSProperties
              }
            >
              <img
                src={`/sprites/${cloud.sprite}.svg`}
                width={cloud.width}
                height={cloud.height}
                alt=""
                className={
                  cloud.reflected
                    ? "hero-sky-cloud hero-cloud-reflected"
                    : "hero-sky-cloud"
                }
              />
            </div>
          ))}
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
      </div>
      <Button
        variant="ghost"
        size="xs"
        className="hero-cloud-toggle absolute right-4 bottom-4 z-10"
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? "Resume clouds" : "Pause clouds"}
      </Button>
      <noscript>
        <style>{`.hero-cloud-toggle { display: none; }`}</style>
      </noscript>
    </>
  );
}
