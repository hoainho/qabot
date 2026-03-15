import path from "node:path";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { nanoid } from "nanoid";
import { BaseRunner } from "./base-runner.js";
import { fileExists } from "../utils/file-utils.js";

export class JestRunner extends BaseRunner {
  constructor(config) {
    super("jest", config);
  }
  getDisplayName() {
    return "Jest";
  }

  async isAvailable(projectDir) {
    return fileExists(path.join(projectDir, "node_modules", ".bin", "jest"));
  }

  buildCommand(options = {}) {
    const jsonFile = path.join(tmpdir(), `qabot-jest-${nanoid(8)}.json`);
    this._jsonFile = jsonFile;

    const pattern = options.pattern || "";
    const jsonArgs = `--json --outputFile="${jsonFile}" --forceExit --detectOpenHandles`;

    if (this.config.command) {
      let cmd = this.config.command;
      if (cmd.includes("{pattern}")) {
        cmd = cmd.replace("{pattern}", pattern);
      } else if (pattern) {
        const separator = cmd.startsWith("npm") ? " -- " : " ";
        cmd = `${cmd}${separator}--testPathPattern="${pattern}"`;
      }
      return `${cmd} ${jsonArgs}`;
    }

    const parts = ["npx", "jest"];
    if (pattern) parts.push(`--testPathPattern="${pattern}"`);
    if (options.coverage) parts.push("--coverage");
    parts.push(jsonArgs);
    return parts.join(" ");
  }

  parseOutput(stdout, stderr, exitCode) {
    const tests = [];
    let jsonData = null;

    try {
      if (this._jsonFile) {
        jsonData = JSON.parse(readFileSync(this._jsonFile, "utf-8"));
      }
    } catch {
      /* JSON file not found — parse from stdout */
    }

    if (!jsonData) {
      try {
        const jsonStart = stdout.indexOf("{");
        if (jsonStart !== -1) jsonData = JSON.parse(stdout.slice(jsonStart));
      } catch {
        /* not valid JSON in stdout */
      }
    }

    if (jsonData && jsonData.testResults) {
      for (const suite of jsonData.testResults) {
        if (suite.assertionResults?.length > 0) {
          for (const test of suite.assertionResults) {
            tests.push({
              name: test.fullName || test.title,
              suite: test.ancestorTitles?.join(" > ") || "",
              file: path.relative(process.cwd(), suite.testFilePath || ""),
              status: mapJestStatus(test.status),
              duration: test.duration || 0,
              error: test.failureMessages?.length
                ? { message: test.failureMessages.join("\n"), stack: "" }
                : null,
              screenshots: [],
              retries: 0,
            });
          }
        } else if (suite.message) {
          tests.push({
            name: `Suite failed: ${path.basename(suite.testFilePath || "unknown")}`,
            suite: "Test Suite Error",
            file: path.relative(process.cwd(), suite.testFilePath || ""),
            status: "failed",
            duration: 0,
            error: {
              message: extractErrorSummary(suite.message),
              stack: suite.message,
            },
            screenshots: [],
            retries: 0,
          });
        }
      }
    }

    if (tests.length === 0 && exitCode !== 0) {
      const errorMsg = extractErrorFromOutput(stderr || stdout);
      if (errorMsg) {
        tests.push({
          name: "Test execution failed",
          suite: "Runtime Error",
          file: "",
          status: "failed",
          duration: 0,
          error: { message: errorMsg, stack: "" },
          screenshots: [],
          retries: 0,
        });
      }
    }

    const summary = buildSummary(jsonData, tests, stdout);
    return { tests, summary, coverage: jsonData?.coverageMap || null };
  }
}

function mapJestStatus(status) {
  const map = {
    passed: "passed",
    failed: "failed",
    pending: "skipped",
    todo: "skipped",
  };
  return map[status] || "skipped";
}

function buildSummary(jsonData, tests, stdout) {
  let summary;

  if (jsonData) {
    const suiteFails = jsonData.numFailedTestSuites || 0;
    const testFails = jsonData.numFailedTests || 0;
    summary = {
      total: (jsonData.numTotalTests || 0) + suiteFails,
      passed: jsonData.numPassedTests || 0,
      failed: testFails + suiteFails,
      skipped: (jsonData.numPendingTests || 0) + (jsonData.numTodoTests || 0),
    };
  } else {
    summary = parseSummaryFromStdout(stdout);
  }

  if (summary.total === 0 && tests.length > 0) {
    summary.total = tests.length;
    summary.passed = tests.filter((t) => t.status === "passed").length;
    summary.failed = tests.filter((t) => t.status === "failed").length;
    summary.skipped = tests.filter((t) => t.status === "skipped").length;
  }

  summary.passRate =
    summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  return summary;
}

function parseSummaryFromStdout(stdout) {
  const summary = { total: 0, passed: 0, failed: 0, skipped: 0, passRate: 0 };
  const testMatch = stdout.match(
    /Tests:\s+(?:(\d+) failed,\s+)?(?:(\d+) skipped,\s+)?(?:(\d+) passed,\s+)?(\d+) total/,
  );
  if (testMatch) {
    summary.failed = parseInt(testMatch[1] || "0");
    summary.skipped = parseInt(testMatch[2] || "0");
    summary.passed = parseInt(testMatch[3] || "0");
    summary.total = parseInt(testMatch[4] || "0");
  }
  return summary;
}

function extractErrorSummary(message) {
  const lines = message.split("\n").filter((l) => l.trim());
  const syntaxLine = lines.find(
    (l) =>
      l.includes("SyntaxError") ||
      l.includes("Cannot find") ||
      l.includes("unexpected token"),
  );
  if (syntaxLine) return syntaxLine.trim().slice(0, 200);
  return lines[0]?.trim().slice(0, 200) || "Unknown error";
}

function extractErrorFromOutput(output) {
  if (!output) return null;
  const lines = output.split("\n");
  const errorLine = lines.find(
    (l) =>
      l.includes("SyntaxError") ||
      l.includes("Error:") ||
      l.includes("Cannot find") ||
      l.includes("FAIL"),
  );
  return errorLine?.trim().slice(0, 300) || null;
}
