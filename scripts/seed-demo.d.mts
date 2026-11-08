import type { OpportunityInput } from "../backend/schemas.ts";
import type { ProjectDraftContent } from "../backend/project-drafts.ts";

export function demoEnvironment(env: {
  SITE_URL?: string;
  CONVEX_DEPLOYMENT?: string;
  CONVEX_DEPLOY_KEY?: string;
}): { origin: string; deployment: string };
export function demoDraftId(key: string): string;
export function demoDraft(details: OpportunityInput): ProjectDraftContent;
export function main(env?: NodeJS.ProcessEnv): Promise<void>;
