import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VERSION,
  TOOL_NAME,
  PROJECT_TYPES,
  RUNNERS,
  AI_PROVIDERS,
  LAYERS,
  PRIORITIES,
  TEST_STATUS,
  DEFAULT_CONFIG,
  FRAMEWORK_DETECT_MAP,
  RUNNER_DETECT_MAP,
} from "../../src/core/constants.js";

describe("constants", () => {
  it("exports valid VERSION", () => {
    assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  });

  it("exports TOOL_NAME as qabot", () => {
    assert.equal(TOOL_NAME, "qabot");
  });

  it("PROJECT_TYPES includes expected types", () => {
    assert.ok(PROJECT_TYPES.includes("react-spa"));
    assert.ok(PROJECT_TYPES.includes("nextjs"));
    assert.ok(PROJECT_TYPES.includes("dotnet"));
    assert.ok(PROJECT_TYPES.includes("python"));
    assert.ok(PROJECT_TYPES.includes("unknown"));
  });

  it("RUNNERS includes all supported runners", () => {
    assert.ok(RUNNERS.includes("jest"));
    assert.ok(RUNNERS.includes("vitest"));
    assert.ok(RUNNERS.includes("playwright"));
    assert.ok(RUNNERS.includes("pytest"));
  });

  it("LAYERS has exactly 3 entries", () => {
    assert.deepEqual(LAYERS, ["unit", "integration", "e2e"]);
  });

  it("TEST_STATUS has all statuses", () => {
    assert.equal(TEST_STATUS.PASSED, "passed");
    assert.equal(TEST_STATUS.FAILED, "failed");
    assert.equal(TEST_STATUS.SKIPPED, "skipped");
    assert.equal(TEST_STATUS.RUNNING, "running");
  });

  it("DEFAULT_CONFIG has reporting section", () => {
    assert.ok(DEFAULT_CONFIG.reporting);
    assert.equal(DEFAULT_CONFIG.reporting.outputDir, "./qabot-reports");
  });

  it("FRAMEWORK_DETECT_MAP maps react to react-spa", () => {
    assert.equal(FRAMEWORK_DETECT_MAP.react.type, "react-spa");
    assert.ok(FRAMEWORK_DETECT_MAP.react.deps.includes("react"));
  });

  it("RUNNER_DETECT_MAP has config files for each runner", () => {
    assert.ok(RUNNER_DETECT_MAP.jest.configs.includes("jest.config.js"));
    assert.ok(
      RUNNER_DETECT_MAP.playwright.configs.includes("playwright.config.js"),
    );
  });
});
