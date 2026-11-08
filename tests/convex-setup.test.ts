import assert from "node:assert/strict";
import test from "node:test";
import { mergeEnvironment } from "../scripts/configure-convex.mjs";

test("Convex setup preserves unrelated settings and replaces only owned keys", () => {
  const result = mergeEnvironment(
    "# local settings\nNEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=example\nSITE_URL=old\n",
    { SITE_URL: "http://127.0.0.1:5173" },
  );
  assert.match(result, /NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=example/);
  assert.match(result, /# local settings/);
  assert.equal(result.match(/SITE_URL=/g)?.length, 1);
  assert.match(result, /SITE_URL=http:\/\/127\.0\.0\.1:5173/);
});
