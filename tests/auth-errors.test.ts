import assert from "node:assert/strict";
import test from "node:test";
import { socialSignInError } from "../lib/auth-errors.ts";

test("provider sign-in error codes become plain language", () => {
  assert.equal(socialSignInError(undefined), null);
  assert.equal(socialSignInError(""), null);
  assert.equal(socialSignInError("___"), null);
  assert.match(socialSignInError("account_not_linked") ?? "", /already exists/);
  assert.match(socialSignInError("ACCESS_DENIED") ?? "", /cancelled/);
  assert.match(
    socialSignInError("email_doesn't_match") ?? "",
    /different email/,
  );
  assert.equal(
    socialSignInError("state_mismatch"),
    socialSignInError("please_restart_the_process"),
  );
});

test("unknown codes are sanitized before they reach the page", () => {
  const message = socialSignInError("<img src=x onerror=alert(1)>") ?? "";
  assert.doesNotMatch(message, /[<>]/);
  assert.match(message, /^Sign-in did not complete \([a-z0-9_]+\)\./);
  const long = socialSignInError("x".repeat(500)) ?? "";
  assert.ok(long.length < 140, "overlong codes are truncated");
});
