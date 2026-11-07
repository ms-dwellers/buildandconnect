import { createApi } from "../../backend/api.ts";
import { AnalysisUnavailable } from "../../backend/ai.ts";
import { analysis, embedding } from "./matching.ts";

// Only the external model boundary is substituted. Auth, SQL, and HTTP run in workerd.
export default createApi({
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
});
