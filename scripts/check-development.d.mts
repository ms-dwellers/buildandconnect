export const tasks: string[];
export function runtimeError(version: string): string | undefined;
export function bunVersionError(version?: string): string | undefined;
export function taskError(task: string, installed: boolean): string | undefined;
