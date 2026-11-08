export const SITE_NAME = "Build & Connect";

/** One title format for every page: "Page | Build & Connect". */
export function pageTitle(name?: string) {
  return name ? `${name} | ${SITE_NAME}` : SITE_NAME;
}
