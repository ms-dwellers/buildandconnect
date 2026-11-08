import { createHttpRouter } from "../../convex/router";
import { AnalysisUnavailable } from "../../backend/ai.ts";
import { analysis, embedding } from "./matching.ts";

// Only model inference is substituted. HTTP/auth/data use production Convex functions.
export default createHttpRouter({
  async analyzeDeveloper(_ai, profile) {
    if (profile.bio.includes("AI_UNAVAILABLE"))
      throw new AnalysisUnavailable("Model unavailable");
    return embedding;
  },
  async analyzeOpportunity(_ai, input) {
    if (input.description.includes("AI_UNAVAILABLE"))
      throw new AnalysisUnavailable("Model unavailable");
    return { analysis, embedding };
  },
  async analyzeRequest(_ai, input) {
    if (input.description.includes("AI_UNAVAILABLE"))
      throw new AnalysisUnavailable("Model unavailable");
    return { analysis, embedding };
  },
});
