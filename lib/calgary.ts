import { NEIGHBOURHOOD_JOBS } from "./calgary-neighbourhoods.ts";

export type CityPoint = { longitude: number; latitude: number };
export type CityJob = CityPoint & {
  id: string;
  title: string;
  organization: string;
  neighbourhood: string;
  kind: "paid" | "volunteer";
  compensation: string;
  commitment: string;
  skills: string[];
  description: string;
  mentorship: boolean;
};

export const CALGARY_CENTER: CityPoint = {
  longitude: -114.0719,
  latitude: 51.0447,
};
export const CALGARY_BOUNDS = [
  [-114.32, 50.84],
  [-113.85, 51.22],
] as const;
export const PREVIEW_BOUNDS = CALGARY_BOUNDS;

export function isInCalgary(point: CityPoint) {
  return (
    Number.isFinite(point.longitude) &&
    Number.isFinite(point.latitude) &&
    point.longitude >= CALGARY_BOUNDS[0][0] &&
    point.longitude <= CALGARY_BOUNDS[1][0] &&
    point.latitude >= CALGARY_BOUNDS[0][1] &&
    point.latitude <= CALGARY_BOUNDS[1][1]
  );
}

export function previewPosition(point: CityPoint) {
  return {
    x:
      ((point.longitude - PREVIEW_BOUNDS[0][0]) /
        (PREVIEW_BOUNDS[1][0] - PREVIEW_BOUNDS[0][0])) *
      100,
    y:
      ((PREVIEW_BOUNDS[1][1] - point.latitude) /
        (PREVIEW_BOUNDS[1][1] - PREVIEW_BOUNDS[0][1])) *
      100,
  };
}

export function previewPoint(x: number, y: number): CityPoint {
  return {
    longitude:
      PREVIEW_BOUNDS[0][0] +
      Math.max(0, Math.min(1, x)) *
        (PREVIEW_BOUNDS[1][0] - PREVIEW_BOUNDS[0][0]),
    latitude:
      PREVIEW_BOUNDS[1][1] -
      Math.max(0, Math.min(1, y)) *
        (PREVIEW_BOUNDS[1][1] - PREVIEW_BOUNDS[0][1]),
  };
}

export function previewViewport(
  width: number,
  height: number,
  center?: CityPoint,
) {
  if (!center) {
    const scale = Math.min(width / 1000, height / 700);
    return {
      width: 1000 * scale,
      height: 700 * scale,
      left: (width - 1000 * scale) / 2,
      top: (height - 700 * scale) / 2,
    };
  }
  const scale = Math.max(width / 1000, height / 700);
  const mapWidth = 1000 * scale;
  const mapHeight = 700 * scale;
  const point = previewPosition(center);
  return {
    width: mapWidth,
    height: mapHeight,
    left: Math.max(
      width - mapWidth,
      Math.min(0, width / 2 - (point.x / 100) * mapWidth),
    ),
    top: Math.max(
      height - mapHeight,
      Math.min(0, height / 2 - (point.y / 100) * mapHeight),
    ),
  };
}

export const CALGARY_JOBS: CityJob[] = [
  {
    id: "kensington",
    title: "A fresh website for a local favourite",
    organization: "Neighbourhood Coffee",
    neighbourhood: "Kensington",
    longitude: -114.0865,
    latitude: 51.0525,
    kind: "paid",
    compensation: "$1,200 project",
    commitment: "2-3 weeks",
    skills: ["React", "Design"],
    description:
      "Help a fictional independent café bring its menu, story, and community events online. A small, thoughtful website with a big neighbourhood heart.",
    mentorship: false,
  },
  {
    id: "east-village",
    title: "Make community events easier to find",
    organization: "East Village Collective",
    neighbourhood: "East Village",
    longitude: -114.0477,
    latitude: 51.0462,
    kind: "volunteer",
    compensation: "Volunteer",
    commitment: "4-6 hrs / week",
    skills: ["TypeScript", "Accessibility"],
    description:
      "Build an accessible events calendar for a demo community collective. Work alongside a senior developer and turn real-world requirements into a useful little product.",
    mentorship: true,
  },
  {
    id: "beltline",
    title: "Give a food rescue team better tools",
    organization: "Second Helping YYC",
    neighbourhood: "Beltline",
    longitude: -114.079,
    latitude: 51.0353,
    kind: "volunteer",
    compensation: "Volunteer",
    commitment: "3-5 hrs / week",
    skills: ["React", "APIs"],
    description:
      "Prototype a pickup dashboard for a fictional food rescue team. Learn API integration while helping an idea with a clear social purpose take shape.",
    mentorship: true,
  },
  {
    id: "inglewood",
    title: "An online home for handmade things",
    organization: "Inglewood Makers",
    neighbourhood: "Inglewood",
    longitude: -114.026,
    latitude: 51.0392,
    kind: "paid",
    compensation: "$1,800 project",
    commitment: "3-4 weeks",
    skills: ["Web design", "JavaScript"],
    description:
      "Create a warm, easy-to-browse catalogue for a demo makers' market. Bring together maker profiles, product stories, and a simple enquiry experience.",
    mentorship: false,
  },
  {
    id: "bridgeland",
    title: "Help neighbours share a little more",
    organization: "The Borrowing Shelf",
    neighbourhood: "Bridgeland",
    longitude: -114.0375,
    latitude: 51.0631,
    kind: "volunteer",
    compensation: "Volunteer",
    commitment: "2-4 hrs / week",
    skills: ["React", "UX"],
    description:
      "Design a lending-library prototype for books, tools, and the things people only need once. A frontend-first demo project with friendly weekly feedback.",
    mentorship: true,
  },
  {
    id: "mission",
    title: "A booking page that feels effortless",
    organization: "Mission Movement",
    neighbourhood: "Mission",
    longitude: -114.0695,
    latitude: 51.0259,
    kind: "paid",
    compensation: "$900 project",
    commitment: "1-2 weeks",
    skills: ["TypeScript", "CSS"],
    description:
      "Build a responsive class schedule and booking-page prototype for a fictional neighbourhood movement studio. Focus on the small interaction details that make a site feel good.",
    mentorship: false,
  },
  {
    id: "university",
    title: "Turn campus research into a story",
    organization: "Campus Climate Lab",
    neighbourhood: "University District",
    longitude: -114.132,
    latitude: 51.0755,
    kind: "paid",
    compensation: "$25-35 / hour",
    commitment: "6-8 hrs / week",
    skills: ["Data visualization", "React"],
    description:
      "Explore a frontend dashboard for a demo research group. Translate a sample climate dataset into clear, approachable charts with guidance from a project lead.",
    mentorship: true,
  },
  ...NEIGHBOURHOOD_JOBS,
];

export function filterCityJobs(
  jobs: CityJob[],
  query: string,
  kind: "all" | CityJob["kind"],
) {
  const term = query.trim().toLowerCase();
  return jobs.filter(
    (job) =>
      (kind === "all" || job.kind === kind) &&
      `${job.title} ${job.organization} ${job.neighbourhood} ${job.skills.join(" ")}`
        .toLowerCase()
        .includes(term),
  );
}
