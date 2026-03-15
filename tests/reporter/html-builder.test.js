import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HtmlBuilder } from "../../src/reporter/html-builder.js";

describe("HtmlBuilder", () => {
  const builder = new HtmlBuilder();

  function createMockResults() {
    return {
      summary: {
        totalTests: 10,
        totalPassed: 8,
        totalFailed: 1,
        totalSkipped: 1,
        overallPassRate: 80,
        totalDuration: 5000,
        byLayer: {
          unit: { total: 7, passed: 6, failed: 1, skipped: 0 },
          e2e: { total: 3, passed: 2, failed: 0, skipped: 1 },
        },
      },
      results: [
        {
          runner: "jest",
          layer: "unit",
          tests: [
            {
              name: "renders correctly",
              status: "passed",
              suite: "LoginForm",
              file: "LoginForm.test.js",
              duration: 120,
            },
            {
              name: "shows error on invalid email",
              status: "failed",
              suite: "LoginForm",
              file: "LoginForm.test.js",
              duration: 340,
              error: {
                message: 'Expected "error" to be visible',
                stack: "at Object.<anonymous>",
              },
            },
            {
              name: "submits form",
              status: "passed",
              suite: "LoginForm",
              file: "LoginForm.test.js",
              duration: 200,
            },
          ],
        },
      ],
    };
  }

  it("renders valid HTML document", () => {
    const html = builder.render(createMockResults(), {
      projectName: "test-project",
      feature: "auth",
      environment: "local",
      timestamp: "2026-03-15T10:00:00Z",
      duration: 5000,
    });

    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes("</html>"));
  });

  it("includes project name and feature in output", () => {
    const html = builder.render(createMockResults(), {
      projectName: "my-cool-app",
      feature: "checkout",
      environment: "qa1",
      timestamp: "2026-03-15T10:00:00Z",
      duration: 3000,
    });

    assert.ok(html.includes("my-cool-app"));
    assert.ok(html.includes("checkout"));
    assert.ok(html.includes("qa1"));
  });

  it("includes summary numbers", () => {
    const html = builder.render(createMockResults(), {
      projectName: "app",
      feature: "all",
      environment: "local",
      timestamp: "2026-01-01T00:00:00Z",
      duration: 1000,
    });

    assert.ok(html.includes("10"));
    assert.ok(html.includes("80%"));
  });

  it("includes test result rows", () => {
    const html = builder.render(createMockResults(), {
      projectName: "app",
      feature: "auth",
      environment: "local",
      timestamp: "2026-01-01T00:00:00Z",
      duration: 1000,
    });

    assert.ok(html.includes("renders correctly"));
    assert.ok(html.includes("shows error on invalid email"));
  });

  it("includes error details for failed tests", () => {
    const html = builder.render(createMockResults(), {
      projectName: "app",
      feature: "auth",
      environment: "local",
      timestamp: "2026-01-01T00:00:00Z",
      duration: 1000,
    });

    assert.ok(html.includes("Expected &quot;error&quot; to be visible"));
  });

  it("escapes HTML in test names", () => {
    const results = createMockResults();
    results.results[0].tests[0].name = '<script>alert("xss")</script>';

    const html = builder.render(results, {
      projectName: "app",
      feature: "auth",
      environment: "local",
      timestamp: "2026-01-01T00:00:00Z",
      duration: 1000,
    });

    assert.ok(!html.includes("<script>alert"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("handles empty results", () => {
    const html = builder.render(
      {
        summary: {
          totalTests: 0,
          totalPassed: 0,
          totalFailed: 0,
          totalSkipped: 0,
          overallPassRate: 0,
          byLayer: {},
        },
        results: [],
      },
      {
        projectName: "app",
        feature: "all",
        environment: "local",
        timestamp: "2026-01-01",
        duration: 0,
      },
    );

    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("0"));
  });

  it("includes inline CSS and JS", () => {
    const html = builder.render(createMockResults(), {
      projectName: "app",
      feature: "auth",
      environment: "local",
      timestamp: "2026-01-01T00:00:00Z",
      duration: 1000,
    });

    assert.ok(html.includes("<style>"));
    assert.ok(html.includes("<script>"));
    assert.ok(html.includes("function filt("));
  });
});
