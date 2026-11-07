import { useId } from "react";

export function CityIllustration({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`${id}-blocks`}
          width="46"
          height="35"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-8)"
        >
          <rect width="46" height="35" fill="var(--map-land)" />
          <rect
            x="5"
            y="5"
            width="34"
            height="23"
            rx="3"
            fill="var(--map-block)"
          />
          <path
            d="M0 0H46V35"
            fill="none"
            stroke="var(--map-road)"
            strokeWidth="5"
          />
        </pattern>
      </defs>
      <rect width="1000" height="700" fill={`url(#${id}-blocks)`} />
      <g fill="var(--map-park)" stroke="var(--map-land)" strokeWidth="4">
        <path d="M0 0H230L210 85 145 135 50 110 0 140Z" />
        <path d="m302 195 90-40 65 80-16 64-70-17Z" />
        <path d="m500 280 82-7 35 22-20 30-79-5Z" />
        <path d="m730 420 83 20 55 110-43 77-92-85Z" />
        <path d="M0 538 114 499 197 575 176 700H0Z" />
        <path d="m796 0 30 132 174 30V0Z" />
        <path d="m151 117 91 11-6 68-86-10Z" />
      </g>
      <g fill="none" stroke="var(--map-road)" strokeWidth="17">
        <path d="M0 230 1000 230M230 0 230 700M0 590 1000 590M620 0 600 175 650 400 690 700" />
        <path d="M0 315 184 310 362 342 550 375 700 430 1000 520" />
      </g>
      <g fill="none" stroke="var(--map-arterial)" strokeWidth="5">
        <path d="M0 230 1000 230M230 0 230 700M0 590 1000 590M620 0 600 175 650 400 690 700" />
      </g>
      <path
        d="M-30 55C100 40 170 110 244 200S375 360 458 327 548 278 613 317 701 368 736 416 830 535 1050 544"
        fill="none"
        stroke="var(--map-water-edge)"
        strokeWidth="33"
      />
      <path
        d="M-30 55C100 40 170 110 244 200S375 360 458 327 548 278 613 317 701 368 736 416 830 535 1050 544"
        fill="none"
        stroke="var(--map-water)"
        strokeWidth="25"
      />
      <path
        d="M390 730C380 650 510 651 532 599S476 544 543 509 623 517 654 461 690 440 737 418"
        fill="none"
        stroke="var(--map-water-edge)"
        strokeWidth="15"
      />
      <path
        d="M390 730C380 650 510 651 532 599S476 544 543 509 623 517 654 461 690 440 737 418"
        fill="none"
        stroke="var(--map-water)"
        strokeWidth="10"
      />
      <g stroke="var(--map-road)" strokeWidth="12">
        <path d="m227 165 35 55m172 100 20 45m156-56 4 43m115 54 30-25m-199 102 24 20" />
      </g>
      <g
        fill="var(--map-label)"
        fontFamily="var(--app-font-sans)"
        fontSize="12"
        letterSpacing="2"
        textAnchor="middle"
      >
        <text x="190" y="105">
          UNIVERSITY DISTRICT
        </text>
        <text x="374" y="257">
          HILLHURST
        </text>
        <text x="510" y="191">
          SUNNYSIDE
        </text>
        <text x="798" y="202">
          BRIDGELAND
        </text>
        <text x="453" y="420">
          DOWNTOWN WEST
        </text>
        <text x="785" y="368">
          EAST VILLAGE
        </text>
        <text x="851" y="603">
          INGLEWOOD
        </text>
        <text x="385" y="554">
          BELTLINE
        </text>
        <text x="582" y="653">
          MISSION
        </text>
        <text
          x="581"
          y="391"
          fontSize="24"
          letterSpacing="5"
          fill="var(--primary)"
        >
          CALGARY
        </text>
      </g>
      <g
        fill="var(--map-label)"
        fontFamily="var(--app-font-sans)"
        fontSize="10"
        fontStyle="italic"
      >
        <text x="354" y="330" transform="rotate(10 354 330)">
          Bow River
        </text>
        <text x="562" y="548" transform="rotate(-30 562 548)">
          Elbow River
        </text>
        <text x="720" y="218">
          16 AVENUE N
        </text>
        <text x="244" y="460" transform="rotate(-90 244 460)">
          CROWCHILD TRAIL
        </text>
        <text x="72" y="581">
          17 AVENUE SW
        </text>
      </g>
    </svg>
  );
}
