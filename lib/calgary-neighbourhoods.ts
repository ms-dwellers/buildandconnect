import type { CityJob } from "./calgary.ts";

// Fictional opportunities at real neighbourhood coordinates, never live vacancies.
// Keep these explicit and deterministic so filtering and demos are reproducible.
type NeighbourhoodJob = Pick<
  CityJob,
  | "id"
  | "title"
  | "organization"
  | "neighbourhood"
  | "longitude"
  | "latitude"
  | "kind"
  | "skills"
  | "description"
>;

const opportunities: NeighbourhoodJob[] = [
  {
    id: "tuscany",
    neighbourhood: "Tuscany",
    longitude: -114.248,
    latitude: 51.125,
    title: "Bring the neighbourhood trail guide online",
    organization: "Tuscany Trail Club",
    kind: "volunteer",
    skills: ["Maps", "JavaScript"],
    description:
      "Prototype an accessible trail guide with route notes and seasonal updates for a fictional walking club.",
  },
  {
    id: "rocky-ridge",
    neighbourhood: "Rocky Ridge",
    longitude: -114.233,
    latitude: 51.148,
    title: "A class calendar for a growing art studio",
    organization: "Ridge Art Room",
    kind: "paid",
    skills: ["TypeScript", "Design"],
    description:
      "Create a mobile-friendly workshop calendar for a demo neighbourhood art studio, with clear dates and class details.",
  },
  {
    id: "royal-oak",
    neighbourhood: "Royal Oak",
    longitude: -114.211,
    latitude: 51.151,
    title: "Make repair workshops easier to discover",
    organization: "Fix It Together",
    kind: "volunteer",
    skills: ["Accessibility", "CSS"],
    description:
      "Build a searchable programme of repair workshops for a fictional community group. Practise accessible forms and useful empty states.",
  },
  {
    id: "arbour-lake",
    neighbourhood: "Arbour Lake",
    longitude: -114.197,
    latitude: 51.135,
    title: "A simple storefront for a local illustrator",
    organization: "Lakehouse Prints",
    kind: "paid",
    skills: ["Web design", "JavaScript"],
    description:
      "Design a lightweight portfolio and product catalogue for a fictional illustrator. Focus on image loading and responsive layouts.",
  },
  {
    id: "bowness",
    neighbourhood: "Bowness",
    longitude: -114.193,
    latitude: 51.089,
    title: "Help a bike co-op organise its inventory",
    organization: "Bow Cycle Collective",
    kind: "volunteer",
    skills: ["TypeScript", "APIs"],
    description:
      "Prototype an inventory dashboard for a demo bike co-op, with parts search and simple stock summaries.",
  },
  {
    id: "montgomery",
    neighbourhood: "Montgomery",
    longitude: -114.166,
    latitude: 51.074,
    title: "Give a neighbourhood bakery a fresh start",
    organization: "Montgomery Bread",
    kind: "paid",
    skills: ["React", "Design"],
    description:
      "Create an inviting menu and opening-hours website for a fictional bakery. Make it fast and easy to use on a phone.",
  },
  {
    id: "dalhousie",
    neighbourhood: "Dalhousie",
    longitude: -114.159,
    latitude: 51.107,
    title: "Make community learning easier to book",
    organization: "Open Door Learning",
    kind: "volunteer",
    skills: ["UX", "Accessibility"],
    description:
      "Explore an accessible registration prototype for a demo adult-learning programme, with clear course information and validation.",
  },
  {
    id: "brentwood",
    neighbourhood: "Brentwood",
    longitude: -114.127,
    latitude: 51.095,
    title: "Turn a book exchange into a searchable library",
    organization: "Brentwood Book Swap",
    kind: "volunteer",
    skills: ["JavaScript", "Search"],
    description:
      "Build a browse-and-filter catalogue using sample books for a fictional neighbourhood book exchange.",
  },
  {
    id: "evanston",
    neighbourhood: "Evanston",
    longitude: -114.107,
    latitude: 51.176,
    title: "A welcoming website for a music teacher",
    organization: "North Notes Studio",
    kind: "paid",
    skills: ["CSS", "Web design"],
    description:
      "Design a clear lessons website for a fictional music studio, with an accessible timetable and enquiry-page prototype.",
  },
  {
    id: "panorama",
    neighbourhood: "Panorama Hills",
    longitude: -114.071,
    latitude: 51.159,
    title: "Help neighbours discover local sports",
    organization: "Panorama Play",
    kind: "volunteer",
    skills: ["TypeScript", "UX"],
    description:
      "Prototype a directory of sample community sports programmes, with filters for age group, schedule and accessibility.",
  },
  {
    id: "country-hills",
    neighbourhood: "Country Hills",
    longitude: -114.052,
    latitude: 51.146,
    title: "Make a family café's menu work on mobile",
    organization: "North Table Café",
    kind: "paid",
    skills: ["React", "CSS"],
    description:
      "Create a responsive, easy-to-read menu for a fictional café, with dietary information and accessible navigation.",
  },
  {
    id: "saddleridge",
    neighbourhood: "Saddle Ridge",
    longitude: -113.945,
    latitude: 51.131,
    title: "Connect newcomers with practical local resources",
    organization: "Welcome Northeast",
    kind: "volunteer",
    skills: ["Accessibility", "Search"],
    description:
      "Build a multilingual-ready resource directory for a demo newcomer support group. Use sample content and clear category navigation.",
  },
  {
    id: "taradale",
    neighbourhood: "Taradale",
    longitude: -113.933,
    latitude: 51.117,
    title: "A digital noticeboard for community events",
    organization: "Taradale Together",
    kind: "volunteer",
    skills: ["TypeScript", "Design"],
    description:
      "Prototype a community noticeboard with sample events, date filters and readable event pages for a fictional residents' group.",
  },
  {
    id: "martindale",
    neighbourhood: "Martindale",
    longitude: -113.958,
    latitude: 51.114,
    title: "Give a home catering business an online menu",
    organization: "Neighbour's Kitchen",
    kind: "paid",
    skills: ["Web design", "JavaScript"],
    description:
      "Create a menu and catering enquiry prototype for a fictional small business. Keep ordering and payments out of this frontend demo.",
  },
  {
    id: "falconridge",
    neighbourhood: "Falconridge",
    longitude: -113.947,
    latitude: 51.099,
    title: "Help a youth club share its programme",
    organization: "Falcon Youth Collective",
    kind: "volunteer",
    skills: ["CSS", "Accessibility"],
    description:
      "Design a welcoming programme website for a demo youth club, with sample activities and clear information for families.",
  },
  {
    id: "sunridge",
    neighbourhood: "Sunridge",
    longitude: -113.985,
    latitude: 51.072,
    title: "A clearer service directory for a small clinic",
    organization: "Sunridge Wellness",
    kind: "paid",
    skills: ["React", "UX"],
    description:
      "Build a service-directory prototype for a fictional wellness practice, using sample content only and no patient data.",
  },
  {
    id: "forest-lawn",
    neighbourhood: "Forest Lawn",
    longitude: -113.972,
    latitude: 51.039,
    title: "Put neighbourhood food stories on the map",
    organization: "International Avenue Stories",
    kind: "paid",
    skills: ["Maps", "JavaScript"],
    description:
      "Create a sample food-and-culture walking guide for a fictional community publication, with readable stories and an accessible list view.",
  },
  {
    id: "dover",
    neighbourhood: "Dover",
    longitude: -113.984,
    latitude: 51.022,
    title: "Make a tool library easier to browse",
    organization: "Dover Tool Share",
    kind: "volunteer",
    skills: ["TypeScript", "Search"],
    description:
      "Prototype a searchable lending catalogue using fictional tools and sample availability, without taking reservations.",
  },
  {
    id: "west-springs",
    neighbourhood: "West Springs",
    longitude: -114.207,
    latitude: 51.058,
    title: "A portfolio for a neighbourhood design studio",
    organization: "Westward Studio",
    kind: "paid",
    skills: ["React", "Design"],
    description:
      "Build an image-led portfolio for a fictional design studio, with thoughtful typography, case studies and performance-friendly images.",
  },
  {
    id: "aspen-woods",
    neighbourhood: "Aspen Woods",
    longitude: -114.208,
    latitude: 51.035,
    title: "A better class finder for a dance school",
    organization: "Aspen Dance Room",
    kind: "paid",
    skills: ["TypeScript", "UX"],
    description:
      "Prototype a class finder for a fictional dance school, with age and schedule filters and keyboard-friendly interactions.",
  },
  {
    id: "signal-hill",
    neighbourhood: "Signal Hill",
    longitude: -114.174,
    latitude: 51.018,
    title: "Help a volunteer team coordinate its shifts",
    organization: "Signal Hill Helpers",
    kind: "volunteer",
    skills: ["JavaScript", "Accessibility"],
    description:
      "Explore a shift-planning frontend using sample volunteers and schedules for a fictional neighbourhood support team.",
  },
  {
    id: "marda-loop",
    neighbourhood: "Marda Loop",
    longitude: -114.106,
    latitude: 51.023,
    title: "A neighbourhood market, all in one place",
    organization: "Loop Local Market",
    kind: "paid",
    skills: ["React", "CSS"],
    description:
      "Create a vendor directory and event-page prototype for a fictional local market. Make it feel welcoming on every screen size.",
  },
  {
    id: "chinook",
    neighbourhood: "Meadowlark Park",
    longitude: -114.073,
    latitude: 50.998,
    title: "Build a product guide for a refill shop",
    organization: "Refill South",
    kind: "paid",
    skills: ["Web design", "JavaScript"],
    description:
      "Design a sample refill-product catalogue for a fictional low-waste shop, with clear prices and product categories.",
  },
  {
    id: "heritage",
    neighbourhood: "Haysboro",
    longitude: -114.084,
    latitude: 50.972,
    title: "Make a community choir easier to join",
    organization: "Heritage Voices",
    kind: "volunteer",
    skills: ["CSS", "Accessibility"],
    description:
      "Build a concert and rehearsal information website for a fictional choir, with accessible event details and sample audio controls.",
  },
  {
    id: "lake-bonavista",
    neighbourhood: "Lake Bonavista",
    longitude: -114.052,
    latitude: 50.939,
    title: "A trail journal for a conservation group",
    organization: "South Lake Stewards",
    kind: "volunteer",
    skills: ["Maps", "TypeScript"],
    description:
      "Prototype a sample wildlife-observation journal for a fictional conservation group. Focus on usable forms and map/list navigation.",
  },
  {
    id: "shawnessy",
    neighbourhood: "Shawnessy",
    longitude: -114.078,
    latitude: 50.907,
    title: "Help a tutoring studio explain what it offers",
    organization: "Southside Study",
    kind: "paid",
    skills: ["React", "Design"],
    description:
      "Create a subject-directory and lesson-enquiry prototype for a fictional tutoring studio, using sample tutor profiles.",
  },
  {
    id: "somerset",
    neighbourhood: "Somerset",
    longitude: -114.083,
    latitude: 50.895,
    title: "A community garden's first website",
    organization: "Somerset Seed Circle",
    kind: "volunteer",
    skills: ["JavaScript", "UX"],
    description:
      "Build a seasonal growing guide and garden noticeboard for a fictional group, with sample plots and a simple events calendar.",
  },
  {
    id: "mckenzie-towne",
    neighbourhood: "McKenzie Towne",
    longitude: -113.966,
    latitude: 50.915,
    title: "Put independent shops in the spotlight",
    organization: "High Street Stories",
    kind: "paid",
    skills: ["Web design", "React"],
    description:
      "Prototype a shop directory for a fictional neighbourhood publication, with short stories and accessible location information.",
  },
  {
    id: "mahogany",
    neighbourhood: "Mahogany",
    longitude: -113.926,
    latitude: 50.897,
    title: "A welcoming site for a lakeside running club",
    organization: "Mahogany Miles",
    kind: "volunteer",
    skills: ["TypeScript", "CSS"],
    description:
      "Create a sample weekly-runs calendar and route guide for a fictional running club, with clear pace and accessibility information.",
  },
  {
    id: "seton",
    neighbourhood: "Seton",
    longitude: -113.954,
    latitude: 50.879,
    title: "Make creative workshops easier to find",
    organization: "Seton Makers Room",
    kind: "paid",
    skills: ["React", "UX"],
    description:
      "Build a workshop discovery prototype for a fictional creative studio, with topic filters and sample workshop details.",
  },
  {
    id: "cranston",
    neighbourhood: "Cranston",
    longitude: -113.979,
    latitude: 50.884,
    title: "Turn river cleanups into a clear action plan",
    organization: "Cranston River Friends",
    kind: "volunteer",
    skills: ["Maps", "Accessibility"],
    description:
      "Design a sample cleanup-event guide for a fictional conservation team, with meeting points and clearly labelled route information.",
  },
];

export const NEIGHBOURHOOD_JOBS: CityJob[] = opportunities.map((job) => ({
  ...job,
  compensation: job.kind === "paid" ? "$1,000-1,500 project" : "Volunteer",
  commitment: job.kind === "paid" ? "2-4 weeks" : "2-4 hrs / week",
  mentorship: job.kind === "volunteer",
}));
