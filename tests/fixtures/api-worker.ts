import { createApi } from "../../backend/api.ts";
import { AnalysisUnavailable } from "../../backend/ai.ts";
import { analysis, embedding } from "./matching.ts";
import { careerTarget } from "./career.ts";

// Only model inference is substituted. Auth and persistence use real Convex.
export default createApi({
  async analyzeCareerTarget(_ai, input) {
    if (input.sourceText.includes("AI_UNAVAILABLE"))
      throw new AnalysisUnavailable("Career analysis unavailable");
    return { ...careerTarget, ...input };
  },
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
