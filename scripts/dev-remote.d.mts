export function remoteSettings(env: Record<string, string | undefined>): {
  origin: string;
  port: number;
};
export function proxyEnvironment(
  env: Record<string, string | undefined>,
): Record<string, string | undefined>;
export function supervise(
  commands: string[][],
  env?: Record<string, string | undefined>,
): Promise<number>;
