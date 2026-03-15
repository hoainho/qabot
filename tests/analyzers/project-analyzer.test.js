import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { analyzeProject } from "../../src/analyzers/project-analyzer.js";

async function createTmpProject(pkg, extraFiles = {}) {
  const dir = path.join(tmpdir(), `qabot-test-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  if (pkg)
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify(pkg),
      "utf-8",
    );
  for (const [name, content] of Object.entries(extraFiles)) {
    const filePath = path.join(dir, name);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
  }
  return dir;
}

describe("analyzeProject", () => {
  it("detects react-spa from package.json", async () => {
    const dir = await createTmpProject({
      name: "my-react-app",
      dependencies: { react: "18.0.0", "react-dom": "18.0.0" },
      devDependencies: { webpack: "^5.0.0" },
    });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.name, "my-react-app");
      assert.equal(profile.type, "react-spa");
      assert.equal(profile.techStack.framework, "react");
      assert.equal(profile.techStack.bundler, "webpack");
      assert.equal(profile.techStack.language, "javascript");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects nextjs project", async () => {
    const dir = await createTmpProject({
      name: "my-next-app",
      dependencies: { next: "14.0.0", react: "18.0.0" },
    });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.type, "nextjs");
      assert.equal(profile.techStack.framework, "nextjs");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects typescript", async () => {
    const dir = await createTmpProject({
      name: "ts-app",
      dependencies: { react: "18.0.0" },
      devDependencies: { typescript: "^5.0.0" },
    });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.techStack.language, "typescript");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects state management", async () => {
    const dir = await createTmpProject({
      name: "redux-app",
      dependencies: { react: "18.0.0", "redux-saga": "^1.0.0" },
    });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.techStack.stateManagement, "redux-saga");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects auth0", async () => {
    const dir = await createTmpProject({
      name: "auth-app",
      dependencies: { react: "18.0.0", "auth0-js": "^9.0.0" },
    });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.techStack.authProvider, "auth0");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects package manager from lock files", async () => {
    const dir = await createTmpProject(
      { name: "yarn-app", dependencies: { react: "18.0.0" } },
      { "yarn.lock": "" },
    );
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.packageManager, "yarn");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects src directory", async () => {
    const dir = await createTmpProject(
      { name: "src-app", dependencies: {} },
      { "src/index.js": "" },
    );
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.paths.src, "src");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns unknown for empty directory", async () => {
    const dir = path.join(tmpdir(), `qabot-test-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.type, "unknown");
      assert.equal(profile.techStack.language, "unknown");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects python project", async () => {
    const dir = await createTmpProject(null, {
      "requirements.txt": "flask==2.0.0\n",
    });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.type, "python");
      assert.equal(profile.techStack.language, "python");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects dotnet project", async () => {
    const dir = await createTmpProject(null, { "MyApp.sln": "" });
    try {
      const profile = await analyzeProject(dir);
      assert.equal(profile.type, "dotnet");
      assert.equal(profile.techStack.language, "csharp");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects styling libraries", async () => {
    const dir = await createTmpProject({
      name: "styled-app",
      dependencies: { react: "18.0.0", "@mui/material": "^5.0.0" },
      devDependencies: { tailwindcss: "^3.0.0" },
    });
    try {
      const profile = await analyzeProject(dir);
      assert.ok(profile.techStack.styling.includes("tailwind"));
      assert.ok(profile.techStack.styling.includes("mui"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
