import path from "node:path";
import { fileExists, readJSON, safeReadFile } from "../utils/file-utils.js";
import { FRAMEWORK_DETECT_MAP } from "../core/constants.js";

export async function analyzeProject(projectDir) {
  const profile = {
    name: path.basename(projectDir),
    type: "unknown",
    techStack: {
      language: "unknown",
      framework: null,
      bundler: null,
      stateManagement: null,
      styling: [],
      apiClient: null,
      authProvider: null,
    },
    paths: { root: projectDir, src: null, tests: null, config: null },
    packageManager: "npm",
  };

  const pkg = await detectPackageJson(projectDir);
  if (pkg) {
    profile.name = pkg.name || profile.name;
    profile.techStack = detectTechStack(pkg);
    profile.type = detectProjectType(pkg, projectDir);
    profile.packageManager = await detectPackageManager(projectDir);
    profile.paths.src = await detectSrcDir(projectDir);
  }

  const dotnet = await detectDotnet(projectDir);
  if (dotnet) {
    profile.type = "dotnet";
    profile.techStack.language = "csharp";
    profile.techStack.framework = "dotnet";
  }

  const python = await detectPython(projectDir);
  if (python) {
    profile.type = "python";
    profile.techStack.language = "python";
  }

  return profile;
}

async function detectPackageJson(dir) {
  try {
    return await readJSON(path.join(dir, "package.json"));
  } catch {
    return null;
  }
}

function detectProjectType(pkg, dir) {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (allDeps.next) return "nextjs";
  if (allDeps["@angular/core"]) return "angular";
  if (allDeps.vue) return "vue";
  if (allDeps.react) return "react-spa";
  if (allDeps.express || allDeps.fastify || allDeps.koa) return "node";
  return "unknown";
}

function detectTechStack(pkg) {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const stack = {
    language: allDeps.typescript ? "typescript" : "javascript",
    framework: null,
    bundler: null,
    stateManagement: null,
    styling: [],
    apiClient: null,
    authProvider: null,
  };

  if (allDeps.next) stack.framework = "nextjs";
  else if (allDeps.react) stack.framework = "react";
  else if (allDeps.vue) stack.framework = "vue";
  else if (allDeps["@angular/core"]) stack.framework = "angular";
  else if (allDeps.express) stack.framework = "express";

  if (allDeps.webpack) stack.bundler = "webpack";
  else if (allDeps.vite) stack.bundler = "vite";
  else if (allDeps.esbuild) stack.bundler = "esbuild";
  else if (allDeps.next) stack.bundler = "turbopack";

  if (allDeps["redux-saga"]) stack.stateManagement = "redux-saga";
  else if (allDeps["@reduxjs/toolkit"]) stack.stateManagement = "redux-toolkit";
  else if (allDeps.redux) stack.stateManagement = "redux";
  else if (allDeps.zustand) stack.stateManagement = "zustand";
  else if (allDeps.xstate) stack.stateManagement = "xstate";
  else if (allDeps.vuex) stack.stateManagement = "vuex";
  else if (allDeps.pinia) stack.stateManagement = "pinia";
  else if (allDeps.mobx) stack.stateManagement = "mobx";

  if (allDeps.tailwindcss) stack.styling.push("tailwind");
  if (allDeps["@mui/material"] || allDeps["@material-ui/core"])
    stack.styling.push("mui");
  if (allDeps["styled-components"]) stack.styling.push("styled-components");
  if (allDeps["@emotion/react"]) stack.styling.push("emotion");
  if (allDeps["@chakra-ui/react"]) stack.styling.push("chakra");
  if (allDeps["antd"]) stack.styling.push("antd");

  if (allDeps.axios) stack.apiClient = "axios";
  else if (allDeps["graphql-request"] || allDeps["@apollo/client"])
    stack.apiClient = "graphql";

  if (
    allDeps["auth0-js"] ||
    allDeps["@auth0/nextjs-auth0"] ||
    allDeps["@auth0/auth0-react"]
  )
    stack.authProvider = "auth0";
  else if (allDeps["firebase"]) stack.authProvider = "firebase";
  else if (allDeps["@okta/okta-react"]) stack.authProvider = "okta";
  else if (allDeps["next-auth"]) stack.authProvider = "next-auth";

  return stack;
}

async function detectPackageManager(dir) {
  if (
    (await fileExists(path.join(dir, "bun.lockb"))) ||
    (await fileExists(path.join(dir, "bun.lock")))
  )
    return "bun";
  if (await fileExists(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (await fileExists(path.join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

async function detectSrcDir(dir) {
  const candidates = ["src", "app", "lib", "source"];
  for (const c of candidates) {
    if (await fileExists(path.join(dir, c))) return c;
  }
  return null;
}

async function detectDotnet(dir) {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(dir);
    return entries.some((e) => e.endsWith(".sln") || e.endsWith(".csproj"));
  } catch {
    return false;
  }
}

async function detectPython(dir) {
  return (
    (await fileExists(path.join(dir, "pyproject.toml"))) ||
    (await fileExists(path.join(dir, "requirements.txt"))) ||
    (await fileExists(path.join(dir, "setup.py")))
  );
}
