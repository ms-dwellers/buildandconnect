import type { CareerTarget } from "../../backend/career/schemas.ts";

export const careerTarget: CareerTarget = {
  title: "Junior full-stack developer",
  sourceText:
    "We need React and TypeScript development skills. Experience with authentication is preferred. A degree is required.",
  requirements: [
    {
      id: "react",
      description: "Build React interfaces",
      skills: ["react"],
      sourceQuote: "React",
    },
    {
      id: "typescript",
      description: "Use TypeScript",
      skills: ["typescript"],
      sourceQuote: "TypeScript",
    },
    {
      id: "authentication",
      description: "Implement authentication",
      skills: ["authentication"],
      sourceQuote: "Experience with authentication is preferred.",
    },
    {
      id: "degree",
      description: "A degree is required",
      skills: [],
      sourceQuote: "A degree is required.",
    },
  ],
};
