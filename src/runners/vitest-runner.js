import path from "node:path";
import { BaseRunner } from "./base-runner.js";
import { fileExists } from "../utils/file-utils.js";

export class VitestRunner extends BaseRunner {
  constructor(config) {
    super("vitest", config);
  }
  getDisplayName() {
    return "Vitest";
  }

  async isAvailable(projectDir) {
    return fileExists(path.join(projectDir, "node_modules", ".bin", "vitest"));
  }

  buildCommand(options = {}) {
    if (this.config.command && options.pattern) {
      return this.config.command.replace("{pattern}", options.pattern);
    }
    const parts = ["npx", "vitest", "run", "--reporter=json"];
    if (options.pattern) parts.push(options.pattern);
    if (options.coverage) parts.push("--coverage");
    return parts.join(" ");
  }

  parseOutput(stdout, stderr, exitCode) {
    const tests = [];
    let jsonData = null;
    try {
      const jsonStart = stdout.indexOf("{");
      if (jsonStart !== -1) jsonData = JSON.parse(stdout.slice(jsonStart));
    } catch {
      /* noop */
    }

    if (jsonData?.testResults) {
      for (const suite of jsonData.testResults) {
        for (const test of suite.assertionResults || []) {
          tests.push({
            name: test.fullName || test.title,
            suite: test.ancestorTitles?.join(" > ") || "",
            file: suite.name || "",
            status:
              test.status === "passed"
                ? "passed"
                : test.status === "failed"
                  ? "failed"
                  : "skipped",
            duration: test.duration || 0,
            error: test.failureMessages?.length
              ? { message: test.failureMessages.join("\n"), stack: "" }
              : null,
            screenshots: [],
            retries: 0,
          });
        }
      }
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
