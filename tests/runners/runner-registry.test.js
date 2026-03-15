import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRunner,
  listRunners,
  isKnownRunner,
} from "../../src/runners/runner-registry.js";

describe("runner-registry", () => {
  it("listRunners returns all registered runners", () => {
    const runners = listRunners();
    assert.ok(runners.includes("jest"));
    assert.ok(runners.includes("vitest"));
    assert.ok(runners.includes("playwright"));
    assert.ok(runners.includes("dotnet"));
    assert.ok(runners.includes("pytest"));
  });

  it("getRunner returns a runner instance for known names", () => {
    const runner = getRunner("jest");
    assert.equal(runner.name, "jest");
    assert.equal(runner.getDisplayName(), "Jest");
  });

  it("getRunner throws for unknown runner", () => {
    assert.throws(() => getRunner("nonexistent"), /Unknown runner/);
  });

  it("isKnownRunner returns true for registered runners", () => {
    assert.ok(isKnownRunner("jest"));
    assert.ok(isKnownRunner("playwright"));
    assert.ok(!isKnownRunner("karma"));
  });

  it("jest runner builds valid command", () => {
    const runner = getRunner("jest", {
      command: "npm test -- --testPathPattern={pattern}",
    });
    const cmd = runner.buildCommand({ pattern: "auth" });
    assert.ok(cmd.includes("auth"));
  });

  it("playwright runner builds valid command", () => {
    const runner = getRunner("playwright");
    const cmd = runner.buildCommand({ pattern: "login.spec.js" });
    assert.ok(cmd.includes("playwright"));
    assert.ok(cmd.includes("login.spec.js"));
  });

  it("all runners implement getDisplayName", () => {
    for (const name of ["jest", "vitest", "playwright", "dotnet", "pytest"]) {
      const runner = getRunner(name);
      assert.ok(typeof runner.getDisplayName() === "string");
      assert.ok(runner.getDisplayName().length > 0);
    }
  });
});
