import { useId } from "react";
import { previewPosition } from "@/lib/calgary";

type Coordinate = readonly [number, number];
function position([longitude, latitude]: Coordinate) {
  const point = previewPosition({ longitude, latitude });
  return `${point.x * 10},${point.y * 7}`;
}
const route = (points: Coordinate[]) => `M${points.map(position).join(" L")}`;

const bowRiver: Coordinate[] = [
  [-114.32, 51.12],
  [-114.26, 51.1],
  [-114.22, 51.08],
  [-114.19, 51.09],
  [-114.15, 51.067],
  [-114.12, 51.06],
  [-114.095, 51.05],
  [-114.075, 51.056],
  [-114.04, 51.045],
  [-114.02, 51.025],
  [-114.005, 50.98],
  [-114.025, 50.935],
  [-114.01, 50.84],
];
const elbowRiver: Coordinate[] = [
  [-114.22, 50.99],
  [-114.15, 51.0],
  [-114.12, 51.015],
  [-114.09, 51.01],
  [-114.08, 51.025],
  [-114.065, 51.025],
  [-114.055, 51.035],
  [-114.04, 51.045],
];
const roads: Coordinate[][] = [
  [
    [-114.25, 51.15],
    [-114.03, 51.16],
    [-113.9, 51.11],
    [-113.9, 50.93],
    [-113.99, 50.86],
    [-114.14, 50.86],
    [-114.22, 50.97],
    [-114.25, 51.15],
  ],
  [
    [-114.32, 51.069],
    [-113.85, 51.069],
  ],
  [
    [-114.07, 51.22],
    [-114.07, 51.06],
    [-114.03, 51.015],
    [-114.025, 50.84],
  ],
  [
    [-114.22, 51.0],
    [-113.87, 51.0],
  ],
  [
    [-114.08, 51.05],
    [-114.075, 50.84],
  ],
  [
    [-114.28, 51.13],
    [-114.12, 51.06],
    [-114.11, 50.97],
  ],
];
const labels: { name: string; at: Coordinate }[] = [
  { name: "TUSCANY", at: [-114.25, 51.16] },
  { name: "EVANSTON", at: [-114.12, 51.195] },
  { name: "SADDLE RIDGE", at: [-113.955, 51.153] },
  { name: "BOWNESS", at: [-114.21, 51.1] },
  { name: "FOREST LAWN", at: [-113.94, 51.045] },
  { name: "WEST SPRINGS", at: [-114.24, 51.04] },
  { name: "SHAWNESSY", at: [-114.12, 50.91] },
  { name: "SETON", at: [-113.94, 50.86] },
];

export function CityIllustration({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const center = previewPosition({ longitude: -114.08, latitude: 51.045 });
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
          width="30"
          height="26"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-8)"
        >
          <rect width="30" height="26" fill="var(--map-land)" />
          <rect
            x="3"
            y="3"
            width="23"
            height="19"
            rx="2"
            fill="var(--map-block)"
          />
        </pattern>
      </defs>
      <rect width="1000" height="700" fill={`url(#${id}-blocks)`} />
      <g fill="var(--map-park)">
        <path
          d={`${route([
            [-114.16, 51.14],
            [-114.1, 51.14],
            [-114.1, 51.1],
            [-114.15, 51.09],
          ])} Z`}
        />
        <path
          d={`${route([
            [-114.14, 50.94],
            [-114.08, 50.925],
            [-114.03, 50.935],
            [-114.0, 50.91],
            [-114.04, 50.9],
            [-114.1, 50.92],
            [-114.14, 50.92],
          ])} Z`}
        />
        <path
          d={`${route([
            [-114.28, 51.12],
            [-114.22, 51.11],
            [-114.2, 51.08],
            [-114.24, 51.08],
          ])} Z`}
        />
      </g>
      <g
        fill="none"
        stroke="var(--map-road)"
        strokeWidth="9"
        strokeLinejoin="round"
      >
        {roads.map((road, index) => (
          <path key={index} d={route(road)} />
        ))}
      </g>
      <g
        fill="none"
        stroke="var(--map-arterial)"
        strokeWidth="3"
        strokeLinejoin="round"
      >
        {roads.map((road, index) => (
          <path key={index} d={route(road)} />
        ))}
      </g>
      <g
        fill="none"
        stroke="var(--map-water)"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d={route(bowRiver)} strokeWidth="10" />
        <path d={route(elbowRiver)} strokeWidth="5" />
      </g>
      <g
        fill="var(--map-label)"
        fontFamily="var(--app-font-sans)"
        fontSize="11"
        letterSpacing="1.5"
        textAnchor="middle"
      >
        {labels.map(({ name, at }) => (
          <text key={name} transform={`translate(${position(at)})`}>
            {name}
          </text>
        ))}
        <text
          x={center.x * 10}
          y={center.y * 7}
          fill="var(--primary)"
          fontSize="19"
          letterSpacing="4"
        >
          CALGARY
        </text>
      </g>
    </svg>
  );
}
