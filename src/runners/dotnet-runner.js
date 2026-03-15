import { BaseRunner } from "./base-runner.js";
import { fileExists } from "../utils/file-utils.js";

export class DotnetRunner extends BaseRunner {
  constructor(config) {
    super("dotnet-test", config);
  }
  getDisplayName() {
    return ".NET Test";
  }

  async isAvailable() {
    try {
      const { execSync } = await import("node:child_process");
      execSync("dotnet --version", { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  buildCommand(options = {}) {
    if (this.config.command && options.pattern) {
      return this.config.command.replace("{pattern}", options.pattern);
    }
    const parts = ["dotnet", "test"];
    if (options.pattern) parts.push(`--filter "${options.pattern}"`);
    parts.push('--logger "trx"', "--results-directory ./qabot-test-results");
    if (options.verbose) parts.push("--verbosity normal");
    return parts.join(" ");
  }

  parseOutput(stdout, stderr, exitCode) {
    const tests = [];
    const passMatch = stdout.match(/Passed:\s+(\d+)/);
    const failMatch = stdout.match(/Failed:\s+(\d+)/);
    const skipMatch = stdout.match(/Skipped:\s+(\d+)/);
    const totalMatch = stdout.match(/Total:\s+(\d+)/);

    const summary = {
      total: parseInt(totalMatch?.[1] || "0"),
      passed: parseInt(passMatch?.[1] || "0"),
      failed: parseInt(failMatch?.[1] || "0"),
      skipped: parseInt(skipMatch?.[1] || "0"),
      passRate: 0,
    };
    summary.passRate =
      summary.total > 0
        ? Math.round((summary.passed / summary.total) * 100)
        : 0;

    return { tests, summary, coverage: null };
  }
}
