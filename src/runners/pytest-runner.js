import { BaseRunner } from "./base-runner.js";

export class PytestRunner extends BaseRunner {
  constructor(config) {
    super("pytest", config);
  }
  getDisplayName() {
    return "pytest";
  }

  async isAvailable() {
    try {
      const { execSync } = await import("node:child_process");
      execSync("python3 -m pytest --version", { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  buildCommand(options = {}) {
    if (this.config.command && options.pattern) {
      return this.config.command.replace("{pattern}", options.pattern);
    }
    const parts = ["python3", "-m", "pytest"];
    if (options.pattern) parts.push(options.pattern);
    parts.push("--tb=short", "-q");
    if (options.verbose) parts.push("-v");
    return parts.join(" ");
  }

  parseOutput(stdout, stderr, exitCode) {
    const tests = [];
    const lines = stdout.split("\n");

    for (const line of lines) {
      const passedMatch = line.match(/^(.+?)\s+PASSED/);
      const failedMatch = line.match(/^(.+?)\s+FAILED/);
      if (passedMatch)
        tests.push({
          name: passedMatch[1].trim(),
          suite: "",
          file: "",
          status: "passed",
          duration: 0,
          error: null,
          screenshots: [],
          retries: 0,
        });
      if (failedMatch)
        tests.push({
          name: failedMatch[1].trim(),
          suite: "",
          file: "",
          status: "failed",
          duration: 0,
          error: { message: "Test failed", stack: "" },
          screenshots: [],
          retries: 0,
        });
    }

    const summaryMatch = stdout.match(
      /(\d+) passed(?:,\s*(\d+) failed)?(?:,\s*(\d+) skipped)?/,
    );
    const summary = {
      total:
        tests.length ||
        parseInt(summaryMatch?.[1] || "0") +
          parseInt(summaryMatch?.[2] || "0") +
          parseInt(summaryMatch?.[3] || "0"),
      passed: parseInt(summaryMatch?.[1] || "0"),
      failed: parseInt(summaryMatch?.[2] || "0"),
      skipped: parseInt(summaryMatch?.[3] || "0"),
      passRate: 0,
    };
    summary.passRate =
      summary.total > 0
        ? Math.round((summary.passed / summary.total) * 100)
        : 0;

    return { tests, summary, coverage: null };
  }
}
