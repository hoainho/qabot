import path from "node:path";
import { BaseRunner } from "./base-runner.js";
import { fileExists } from "../utils/file-utils.js";

export class PlaywrightRunner extends BaseRunner {
  constructor(config) {
    super("playwright", config);
  }
  getDisplayName() {
    return "Playwright";
  }

  async isAvailable(projectDir) {
    return fileExists(
      path.join(projectDir, "node_modules", ".bin", "playwright"),
    );
  }

  buildCommand(options = {}) {
    if (this.config.command && options.pattern) {
      return this.config.command.replace("{pattern}", options.pattern);
    }

    const parts = ["npx", "playwright", "test"];
    if (options.pattern) parts.push(options.pattern);
    if (options.project) parts.push(`--project=${options.project}`);
    if (options.headed) parts.push("--headed");
    if (options.grep) parts.push(`--grep="${options.grep}"`);
    parts.push("--reporter=json");
    return parts.join(" ");
  }

  parseOutput(stdout, stderr, exitCode) {
    const tests = [];
    let jsonData = null;

    try {
      const jsonStart = stdout.indexOf("{");
      if (jsonStart !== -1) jsonData = JSON.parse(stdout.slice(jsonStart));
    } catch {
      /* fall through to manual parse */
    }

    if (jsonData?.suites) {
      flattenPlaywrightSuites(jsonData.suites, tests);
    }

    const summary = {
      total: tests.length,
      passed: tests.filter((t) => t.status === "passed").length,
      failed: tests.filter((t) => t.status === "failed").length,
      skipped: tests.filter((t) => t.status === "skipped").length,
      passRate: 0,
    };
    summary.passRate =
      summary.total > 0
        ? Math.round((summary.passed / summary.total) * 100)
        : 0;

    return { tests, summary, coverage: null };
  }
}

function flattenPlaywrightSuites(suites, tests, parentTitle = "") {
  for (const suite of suites) {
    const suiteName = parentTitle
      ? `${parentTitle} > ${suite.title}`
      : suite.title;

    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const lastResult = test.results?.[test.results.length - 1];
        tests.push({
          name: spec.title,
          suite: suiteName,
          file: suite.file || "",
          status: mapPlaywrightStatus(test.status || lastResult?.status),
          duration: lastResult?.duration || 0,
          error: lastResult?.error
            ? {
                message: lastResult.error.message || "",
                stack: lastResult.error.stack || "",
              }
            : null,
          screenshots: (lastResult?.attachments || [])
            .filter((a) => a.contentType?.startsWith("image/"))
            .map((a) => a.path),
          retries: (test.results?.length || 1) - 1,
        });
      }
    }

    if (suite.suites) flattenPlaywrightSuites(suite.suites, tests, suiteName);
  }
}

function mapPlaywrightStatus(status) {
  const map = {
    expected: "passed",
    unexpected: "failed",
    flaky: "passed",
    skipped: "skipped",
    timedOut: "failed",
  };
  return map[status] || status || "skipped";
}
