export function mergeEnvironment(
  text: string,
  values: Record<string, string>,
): string;
export function configure(siteUrl?: string): Promise<void>;
export const PROVIDER_VARIABLES: string[];
export function providerSummary(names: Set<string>): string;
