import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  validateConfig,
  loadConfig,
  writeConfig,
} from "../../src/core/config.js";

describe("validateConfig", () => {
  it("returns valid for complete config", () => {
    const result = validateConfig({
      project: { name: "test", type: "react-spa" },
      layers: { unit: { runner: "jest", command: "npm test" } },
    });
    assert.ok(result.valid);
    assert.equal(result.errors.length, 0);
  });

  it("returns errors for missing project.name", () => {
    const result = validateConfig({ project: {} });
    assert.ok(!result.valid);
    assert.ok(result.errors.some((e) => e.includes("project.name")));
  });

  it("returns errors for missing project.type", () => {
    const result = validateConfig({ project: { name: "test" } });
    assert.ok(!result.valid);
    assert.ok(result.errors.some((e) => e.includes("project.type")));
  });

  it("returns errors for layer missing runner", () => {
    const result = validateConfig({
      project: { name: "test", type: "node" },
      layers: { unit: { command: "npm test" } },
    });
    assert.ok(!result.valid);
    assert.ok(result.errors.some((e) => e.includes("layers.unit.runner")));
  });

  it("returns errors for layer missing command", () => {
    const result = validateConfig({
      project: { name: "test", type: "node" },
      layers: { unit: { runner: "jest" } },
    });
    assert.ok(!result.valid);
    assert.ok(result.errors.some((e) => e.includes("layers.unit.command")));
  });
});

describe("loadConfig", () => {
  it("returns default config when no config file exists", async () => {
    const tmpDir = path.join(tmpdir(), `qabot-test-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
    try {
      const { config, isEmpty } = await loadConfig(tmpDir);
      assert.ok(isEmpty);
      assert.ok(config.reporting);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("writeConfig", () => {
  it("writes qabot.config.json to target directory", async () => {
    const tmpDir = path.join(tmpdir(), `qabot-test-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
    try {
      const data = { project: { name: "test-proj", type: "node" } };
      const configPath = await writeConfig(tmpDir, data);
      assert.ok(configPath.endsWith("qabot.config.json"));

      const { readFile } = await import("node:fs/promises");
      const content = await readFile(configPath, "utf-8");
      assert.ok(content.includes("test-proj"));
      JSON.parse(content);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
