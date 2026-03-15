export class TestResult {
  constructor(runner, layer, feature) {
    this.runner = runner;
    this.layer = layer;
    this.feature = feature;
    this.timestamp = new Date().toISOString();
    this.duration = 0;
    this.summary = { total: 0, passed: 0, failed: 0, skipped: 0, passRate: 0 };
    this.tests = [];
    this.coverage = null;
    this.artifacts = [];
    this.errors = [];
    this.rawOutput = "";
  }
}

export class ResultCollector {
  constructor() {
    this.results = [];
  }

  addResult(testResult) {
    this.results.push(testResult);
  }

  getSummary() {
    const byLayer = {};
    const byFeature = {};
    let totalTests = 0,
      totalPassed = 0,
      totalFailed = 0,
      totalSkipped = 0,
      totalDuration = 0;

    for (const r of this.results) {
      totalTests += r.summary.total;
      totalPassed += r.summary.passed;
      totalFailed += r.summary.failed;
      totalSkipped += r.summary.skipped;
      totalDuration += r.duration;

      if (!byLayer[r.layer])
        byLayer[r.layer] = { total: 0, passed: 0, failed: 0, skipped: 0 };
      byLayer[r.layer].total += r.summary.total;
      byLayer[r.layer].passed += r.summary.passed;
      byLayer[r.layer].failed += r.summary.failed;
      byLayer[r.layer].skipped += r.summary.skipped;

      if (!byFeature[r.feature])
        byFeature[r.feature] = { total: 0, passed: 0, failed: 0, skipped: 0 };
      byFeature[r.feature].total += r.summary.total;
      byFeature[r.feature].passed += r.summary.passed;
      byFeature[r.feature].failed += r.summary.failed;
      byFeature[r.feature].skipped += r.summary.skipped;
    }

    return {
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      overallPassRate:
        totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
      totalDuration,
      byLayer,
      byFeature,
    };
  }

  getAllTests() {
    return this.results.flatMap((r) => r.tests);
  }

  getFailedTests() {
    return this.getAllTests().filter((t) => t.status === "failed");
  }

  toJSON() {
    return { results: this.results, summary: this.getSummary() };
  }
}
