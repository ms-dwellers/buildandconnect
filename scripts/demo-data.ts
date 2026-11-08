import type {
  DeveloperProfile,
  OpportunityInput,
  RequestInput,
} from "../backend/schemas.ts";
import type { CareerTargetInput } from "../backend/career/schemas.ts";

export const DEMO_NOTICE =
  "Hackathon demo: fictional people and projects, not real vacancies or commitments.";
const profile = (
  bio: string,
  skills: string[],
  interests: string[],
  wantsToLearn: string[],
): DeveloperProfile => ({
  bio: `${DEMO_NOTICE}\n\n${bio}`,
  city: "Calgary",
  skills: skills.map((name) => ({ name, level: 2 })),
  projects: [],
  interests,
  wantsToLearn,
  experienceLevel: 2,
  collaboration: "flexible",
  weeklyHours: 8,
  acceptsVolunteer: true,
  available: true,
  discoverable: true,
});

export const demoAccounts = [
  {
    key: "maya",
    name: "Maya — NeighbourWorks Demo",
    role: "requester" as const,
  },
  {
    key: "jordan",
    name: "Jordan — Riverbend Demo",
    role: "requester" as const,
  },
  {
    key: "avery",
    name: "Avery Chen (Demo)",
    role: "developer" as const,
    profile: profile(
      "I build accessible React interfaces and small JavaScript tools. I would like to practice authentication and databases on a useful community project.",
      ["react", "javascript", "html", "css"],
      ["food security", "accessibility"],
      ["authentication", "sql", "nodejs"],
    ),
  },
  {
    key: "nia",
    name: "Nia Brooks (Demo)",
    role: "developer" as const,
    profile: profile(
      "I have built volunteer sign-up forms with React and Node.js. I enjoy making everyday services easier to use.",
      ["react", "javascript", "nodejs", "sql"],
      ["food security", "community"],
      ["testing", "accessibility"],
    ),
  },
  {
    key: "samira",
    name: "Samira Patel (Demo)",
    role: "developer" as const,
    profile: profile(
      "I design clear interfaces and build responsive websites. My school projects include accessible forms and a small booking calendar.",
      ["react", "html", "css", "javascript", "ui design"],
      ["repair", "education", "accessibility"],
      ["databases", "user research"],
    ),
  },
  {
    key: "theo",
    name: "Theo Martin (Demo)",
    role: "developer" as const,
    profile: profile(
      "I build small Python and JavaScript tools to organize community information. I enjoy working with practical data and environmental projects.",
      ["python", "javascript", "html", "css", "sql"],
      ["environment", "community", "gardening"],
      ["react", "data visualization"],
    ),
  },
];

const project = (
  title: string,
  description: string,
  interests: string[],
  latitude: number,
  longitude: number,
  extra: Partial<OpportunityInput> = {},
): OpportunityInput => ({
  title,
  description: `${DEMO_NOTICE}\n\n${description}`,
  city: "Calgary",
  kind: "volunteer",
  remote: true,
  essentialTechnologies: [],
  minimumWeeklyHours: 3,
  collaboration: "flexible",
  interests,
  place: "Demo meeting point — Calgary",
  latitude,
  longitude,
  commitment: "3–5 hours/week for 4 weeks",
  ...extra,
});

export const demoProjects = [
  {
    key: "food-bank",
    owner: "maya",
    details: project(
      "A simpler way to coordinate food-bank volunteers",
      "Our fictional food-bank team coordinates shifts in a spreadsheet. Build a React interface where volunteers can sign in, choose a shift and cancel a booking. Add a Node.js API and a small SQL database for shifts and bookings. Start with one location and test keyboard access and duplicate bookings. A volunteer developer will offer a weekly code review and help scope the first version.",
      ["food security", "accessibility"],
      51.0525,
      -114.0865,
      {
        essentialTechnologies: ["react"],
        minimumWeeklyHours: 4,
        place: "Demo meeting point — Kensington",
      },
    ),
  },
  {
    key: "repair-cafe",
    owner: "jordan",
    details: project(
      "Help neighbours book a repair-café visit",
      "A fictional repair café needs a small, accessible booking website. Build a React calendar, a form for the item needing repair, and a confirmation screen. Save bookings to a database and give organizers a simple daily list. Begin with one Saturday event. A volunteer mentor can review the work each week.",
      ["repair", "environment", "accessibility"],
      51.0284,
      -114.0353,
      {
        essentialTechnologies: ["react"],
        place: "Demo meeting point — Inglewood",
      },
    ),
  },
  {
    key: "library",
    owner: "maya",
    details: project(
      "Make a neighbourhood tool library easier to browse",
      "Build a responsive catalogue for a fictional tool-sharing group. Show categories, tool availability and a request form. Use accessible HTML and CSS with JavaScript filtering, then add a simple database-backed inventory. A coordinator can explain the current process and test prototypes. No formal mentorship is promised.",
      ["community", "repair"],
      51.0665,
      -114.096,
      { place: "Demo meeting point — Hillhurst" },
    ),
  },
  {
    key: "garden",
    owner: "jordan",
    details: project(
      "A watering calendar for a community garden",
      "Our fictional garden needs a shared weekly watering rota. Build a mobile-friendly JavaScript calendar, let volunteers claim a day, and show unfilled dates clearly. Store the rota in a database and add a printable weekly view. A coordinator will give feedback on each prototype.",
      ["gardening", "environment"],
      51.084,
      -114.187,
      {
        essentialTechnologies: ["javascript"],
        place: "Demo meeting point — Bowness",
      },
    ),
  },
  {
    key: "access-map",
    owner: "maya",
    details: project(
      "Map accessible entrances at community venues",
      "Prototype a map for a fictional accessibility group. Show venue entrances, step-free notes and a text-only list of the same information. Build a React interface with Mapbox and an editable data source. Do not infer accessibility facts; use only the clearly labeled sample dataset. A developer mentor will help with map controls and keyboard testing.",
      ["accessibility", "community"],
      51.045,
      -114.058,
      {
        kind: "paid",
        compensation: "$900 fixed project budget (demo only)",
        essentialTechnologies: ["react"],
        place: "Demo meeting point — East Village",
      },
    ),
  },
  {
    key: "clothing",
    owner: "jordan",
    details: project(
      "Give a clothing swap a clear event page",
      "Create a responsive event page for a fictional clothing-swap team. Include opening times, accepted items, accessible travel information and a volunteer enquiry form. Build with HTML and CSS, test on phones, and include clear form errors. The organizer will provide sample copy and feedback.",
      ["environment", "community"],
      51.038,
      -114.092,
      {
        kind: "paid",
        compensation: "$500 fixed project budget (demo only)",
        minimumWeeklyHours: 2,
        place: "Demo meeting point — Beltline",
      },
    ),
  },
  {
    key: "homework",
    owner: "maya",
    details: project(
      "Match study sessions to available volunteer tutors",
      "Build a small prototype for a fictional homework club. Tutors enter subjects and available times; a coordinator views a filtered session list and records bookings. Use React forms and a database-backed API. Use synthetic records only, with no children's personal information. A volunteer developer can offer weekly feedback.",
      ["education", "community"],
      51.071,
      -113.982,
      {
        essentialTechnologies: ["react"],
        place: "Demo meeting point — Rundle",
      },
    ),
  },
  {
    key: "river-data",
    owner: "jordan",
    details: project(
      "Turn river-cleanup notes into a useful dashboard",
      "A fictional environmental group wants to understand its sample cleanup logs. Use Python to validate CSV files and create an accessible web dashboard showing totals by date and location. Include a table beside every chart, and document how new sample data can be imported. A volunteer analyst will explain the dataset; no formal technical mentorship is promised.",
      ["environment", "data"],
      50.985,
      -114.031,
      {
        essentialTechnologies: ["python"],
        place: "Demo meeting point — Carburn Park",
      },
    ),
  },
];

export const demoRequests: {
  key: string;
  owner: string;
  details: RequestInput;
}[] = [
  {
    key: "compost",
    owner: "jordan",
    details: {
      title: "Make our compost schedule readable on phones",
      description: `${DEMO_NOTICE}\n\nA fictional garden group needs its four-week compost rota turned into a clear HTML and CSS page, with headings, large text and a printable version. Sample information is ready; this is a small volunteer task.`,
      place: "Demo pin — Bowness",
      latitude: 51.084,
      longitude: -114.187,
    },
  },
  {
    key: "pantry",
    owner: "maya",
    details: {
      title: "Tidy up a pantry's volunteer sign-up form",
      description: `${DEMO_NOTICE}\n\nReview a fictional pantry's sample HTML form, fix keyboard navigation and labels, and add helpful JavaScript validation. Please use only the sample data, not real volunteer details. This is a small volunteer task.`,
      place: "Demo pin — Sunnyside",
      latitude: 51.057,
      longitude: -114.071,
    },
  },
  {
    key: "poster",
    owner: "jordan",
    details: {
      title: "Turn a repair-day poster into a web page",
      description: `${DEMO_NOTICE}\n\nA fictional repair-day organizer has sample poster text. Make a small HTML and CSS page with event times, directions and a clear list of what to bring. Check it on a narrow phone screen. This is a volunteer task.`,
      place: "Demo pin — Inglewood",
      latitude: 51.027,
      longitude: -114.028,
    },
  },
  {
    key: "csv",
    owner: "maya",
    details: {
      title: "Help clean a neighbourhood survey spreadsheet",
      description: `${DEMO_NOTICE}\n\nUse Python to remove duplicate rows and standardize dates in a synthetic community-survey CSV. Return a documented script and a short summary of corrections. There is no real personal data in the sample. This is a volunteer task.`,
      place: "Demo pin — Bridgeland",
      latitude: 51.051,
      longitude: -114.036,
    },
  },
];

export const demoCareerTarget: CareerTargetInput = {
  sourceText:
    "Fictional hackathon example, not a real job opening. We are looking for a junior full-stack developer. Build accessible React interfaces. Implement sign-in and authorization in a Node.js API. Design SQL tables and queries for application data. Write automated tests for user journeys. Collaborate through code review and explain technical decisions clearly.",
};

export const demoInterests = [
  {
    project: "food-bank",
    developer: "nia",
    requester: false,
    interested: true,
  },
  {
    project: "repair-cafe",
    developer: "samira",
    requester: true,
    interested: true,
  },
  {
    project: "library",
    developer: "avery",
    requester: true,
    interested: false,
  },
  { project: "garden", developer: "theo", requester: false, interested: true },
];
