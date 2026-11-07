import assert from "node:assert/strict";
import test from "node:test";
import {
  runtimeError,
  taskError,
  tasks,
} from "../scripts/check-development.mjs";

test("development accepts the supported Node release line", () => {
  for (const version of ["26.13.0", "v26.13.0", "26.14.0", "26.13.1"]) {
    assert.equal(runtimeError(version), undefined);
  }
});

test("development rejects old, unsupported, and malformed Node versions", () => {
  for (const version of ["24.21.0", "26.12.9", "27.0.0", "invalid"]) {
    assert.match(runtimeError(version) ?? "", /Node.js .* is required/);
  }
});

test("setup can run before dependencies exist", () => {
  assert.equal(taskError("setup", false), undefined);
  assert.match(taskError("dev", false) ?? "", /Dependencies are missing/);
});

test("development tasks reuse package scripts but do not expose deployment", () => {
  assert.ok(tasks.includes("smoke"));
  assert.equal(taskError("check", true), undefined);
  assert.match(taskError("deploy", true) ?? "", /Unknown development task/);
  assert.match(taskError("not-a-task", true) ?? "", /Unknown development task/);
});
