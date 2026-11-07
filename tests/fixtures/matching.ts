import type {
  Developer,
  JobAnalysis,
  Opportunity,
} from "../../backend/schemas.ts";

export const embedding = [1, ...Array<number>(383).fill(0)];
export const analysis: JobAnalysis = {
  requiredTechnologies: ["react"],
  preferredTechnologies: ["typescript"],
  difficulty: 2,
  experienceLevel: "beginner",
  requiredSkills: ["frontend"],
  responsibilities: ["Build an accessible community website"],
  learningOpportunities: ["typescript", "accessibility"],
  mentorshipAvailable: true,
};
export const opportunity: Opportunity = {
  id: "opportunity",
  ownerId: "company",
  title: "Community website",
  description:
    "Build an accessible website for a community garden. React required; TypeScript preferred. Mentorship available.",
  city: "Toronto",
  remote: false,
  kind: "volunteer",
  essentialTechnologies: ["react"],
  minimumWeeklyHours: 5,
  collaboration: "async",
  interests: ["community"],
  status: "open",
  analysis,
  embedding,
};
export const developer: Developer = {
  id: "junior",
  name: "Junior Developer",
  bio: "I build community websites using React.",
  city: "Toronto",
  skills: [{ name: "react", level: 3 }],
  projects: [
    {
      title: "Garden site",
      description: "A community garden landing page",
      technologies: ["react"],
    },
  ],
  interests: ["community"],
  wantsToLearn: ["typescript", "accessibility"],
  experienceLevel: 1,
  collaboration: "async",
  weeklyHours: 10,
  acceptsVolunteer: true,
  available: true,
  discoverable: true,
  recentExposure: 0,
  embedding,
  location: {
    latitude: 43.6532,
    longitude: -79.3832,
    radiusKm: 25,
  },
};
