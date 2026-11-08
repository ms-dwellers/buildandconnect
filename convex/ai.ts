import { AnalysisUnavailable, type AIService } from "../backend/ai.ts";

/** Provider credentials stay in Convex. No Worker or browser AI binding is needed. */
export function workersAI(): AIService | undefined {
  const account = process.env.WORKERS_AI_ACCOUNT_ID;
  const token = process.env.WORKERS_AI_API_TOKEN;
  if (process.env.WORKERS_AI_ENABLED !== "true" || !account || !token)
    return undefined;
  if (!/^[a-f0-9]{32}$/i.test(account))
    throw new AnalysisUnavailable("Workers AI is not configured");
  return {
    async run(model, input, options) {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
          signal: options?.signal,
          redirect: "error",
        },
      );
      if (!response.ok)
        throw new AnalysisUnavailable("Workers AI is unavailable");
      const payload: unknown = await response.json();
      if (
        !payload ||
        typeof payload !== "object" ||
        !("success" in payload) ||
        payload.success !== true ||
        !("result" in payload) ||
        !payload.result ||
        typeof payload.result !== "object" ||
        Array.isArray(payload.result)
      )
        throw new AnalysisUnavailable("Workers AI is unavailable");
      return payload.result as Record<string, unknown>;
    },
  };
}
