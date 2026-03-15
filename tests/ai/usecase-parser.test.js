import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { UseCaseParser } from "../../src/ai/usecase-parser.js";

async function writeTmpFile(name, content) {
  const dir = path.join(tmpdir(), `qabot-uc-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  await writeFile(filePath, content, "utf-8");
  return { filePath, dir };
}

describe("UseCaseParser", () => {
  const parser = new UseCaseParser();

  describe("parseMarkdown", () => {
    it("parses sections with numbered steps", async () => {
      const { filePath, dir } = await writeTmpFile(
        "test.md",
        `## Login Flow
1. Go to homepage
2. Click Sign In
3. Enter email
4. Click Continue

## Signup Flow
1. Go to homepage
2. Click Sign Up
3. Fill form
`,
      );
      try {
        const scenarios = await parser.parse(filePath);
        assert.equal(scenarios.length, 2);
        assert.equal(scenarios[0].scenario, "Login Flow");
        assert.equal(scenarios[0].steps.length, 4);
        assert.equal(scenarios[0].steps[0], "Go to homepage");
        assert.equal(scenarios[1].scenario, "Signup Flow");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("parses bullet list steps", async () => {
      const { filePath, dir } = await writeTmpFile(
        "test.md",
        `## Auth
- Navigate to login page
- Enter credentials
- Submit form
`,
      );
      try {
        const scenarios = await parser.parse(filePath);
        assert.equal(scenarios.length, 1);
        assert.equal(scenarios[0].steps.length, 3);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("falls back to flat list when no headers", async () => {
      const { filePath, dir } = await writeTmpFile(
        "test.md",
        `1. Step one
2. Step two
3. Step three
`,
      );
      try {
        const scenarios = await parser.parse(filePath);
        assert.equal(scenarios.length, 1);
        assert.equal(scenarios[0].scenario, "Default Flow");
        assert.equal(scenarios[0].steps.length, 3);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  });

  describe("parseGherkin", () => {
    it("parses Gherkin scenarios", async () => {
      const { filePath, dir } = await writeTmpFile(
        "test.feature",
        `Feature: Login

Scenario: Successful login
  Given I am on the login page
  When I enter valid credentials
  And I click the login button
  Then I should see the dashboard

Scenario: Failed login
  Given I am on the login page
  When I enter invalid credentials
  Then I should see an error message
`,
      );
      try {
        const scenarios = await parser.parse(filePath);
        assert.equal(scenarios.length, 2);
        assert.equal(scenarios[0].scenario, "Successful login");
        assert.equal(scenarios[0].steps.length, 4);
        assert.equal(scenarios[0].source, "gherkin");
        assert.equal(scenarios[1].scenario, "Failed login");
        assert.equal(scenarios[1].steps.length, 3);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  });

  describe("parsePlainText", () => {
    it("parses numbered plain text", async () => {
      const { filePath, dir } = await writeTmpFile(
        "test.txt",
        `Login Flow
1. Open browser
2. Go to app
3. Click login

Checkout Flow
1. Add item to cart
2. Go to checkout
3. Pay
`,
      );
      try {
        const scenarios = await parser.parse(filePath);
        assert.equal(scenarios.length, 2);
        assert.equal(scenarios[0].steps.length, 3);
        assert.equal(scenarios[0].source, "text");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  });
});
