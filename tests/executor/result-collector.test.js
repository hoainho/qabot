import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ResultCollector,
  TestResult,
} from "../../src/executor/result-collector.js";

describe("TestResult", () => {
  it("initializes with correct defaults", () => {
    const tr = new TestResult("jest", "unit", "auth");
    assert.equal(tr.runner, "jest");
    assert.equal(tr.layer, "unit");
    assert.equal(tr.feature, "auth");
    assert.equal(tr.duration, 0);
    assert.equal(tr.summary.total, 0);
    assert.deepEqual(tr.tests, []);
    assert.equal(tr.coverage, null);
  });

  it("has valid ISO timestamp", () => {
    const tr = new TestResult("jest", "unit", "auth");
    assert.ok(tr.timestamp);
    assert.ok(!isNaN(Date.parse(tr.timestamp)));
  });
});

describe("ResultCollector", () => {
  function createResult(layer, passed, failed, skipped = 0) {
    const tr = new TestResult("jest", layer, "auth");
    tr.summary = {
      total: passed + failed + skipped,
      passed,
      failed,
      skipped,
      passRate: 0,
    };
    tr.duration = 1000;
    tr.tests = [
      ...Array(passed)
        .fill(null)
        .map((_, i) => ({
          name: `pass-${i}`,
          status: "passed",
          duration: 100,
        })),
      ...Array(failed)
        .fill(null)
        .map((_, i) => ({
          name: `fail-${i}`,
          status: "failed",
          duration: 200,
          error: { message: "oops" },
        })),
      ...Array(skipped)
        .fill(null)
        .map((_, i) => ({ name: `skip-${i}`, status: "skipped", duration: 0 })),
    ];
    return tr;
  }

  it("starts empty", () => {
    const rc = new ResultCollector();
    const summary = rc.getSummary();
    assert.equal(summary.totalTests, 0);
    assert.equal(summary.overallPassRate, 0);
  });

  it("aggregates results correctly", () => {
    const rc = new ResultCollector();
    rc.addResult(createResult("unit", 5, 1));
    rc.addResult(createResult("e2e", 3, 2));

    const summary = rc.getSummary();
    assert.equal(summary.totalTests, 11);
    assert.equal(summary.totalPassed, 8);
    assert.equal(summary.totalFailed, 3);
    assert.equal(summary.overallPassRate, 73);
    assert.equal(summary.totalDuration, 2000);
  });

  it("groups by layer", () => {
    const rc = new ResultCollector();
    rc.addResult(createResult("unit", 10, 0));
    rc.addResult(createResult("e2e", 2, 3));

    const summary = rc.getSummary();
    assert.equal(summary.byLayer.unit.total, 10);
    assert.equal(summary.byLayer.unit.failed, 0);
    assert.equal(summary.byLayer.e2e.total, 5);
    assert.equal(summary.byLayer.e2e.failed, 3);
  });

  it("getAllTests flattens across results", () => {
    const rc = new ResultCollector();
    rc.addResult(createResult("unit", 3, 1));
    rc.addResult(createResult("e2e", 2, 0));

    assert.equal(rc.getAllTests().length, 6);
  });

  it("getFailedTests returns only failures", () => {
    const rc = new ResultCollector();
    rc.addResult(createResult("unit", 5, 2));

    const failed = rc.getFailedTests();
    assert.equal(failed.length, 2);
    assert.ok(failed.every((t) => t.status === "failed"));
  });

  it("toJSON returns results and summary", () => {
    const rc = new ResultCollector();
    rc.addResult(createResult("unit", 3, 0));

    const json = rc.toJSON();
    assert.ok(json.results);
    assert.ok(json.summary);
    assert.equal(json.results.length, 1);
    assert.equal(json.summary.totalTests, 3);
  });

  it("handles skipped tests", () => {
    const rc = new ResultCollector();
    rc.addResult(createResult("unit", 2, 1, 3));

    const summary = rc.getSummary();
    assert.equal(summary.totalTests, 6);
    assert.equal(summary.totalSkipped, 3);
  });
});
