import path from "node:path";
import { fileExists, readJSON, findFiles } from "../utils/file-utils.js";
import { RUNNER_DETECT_MAP } from "../core/constants.js";

export async function detectTests(projectDir, projectProfile) {
  const result = {
    frameworks: [],
    testFiles: {
      unit: { count: 0, pattern: null, examples: [] },
      integration: { count: 0, pattern: null },
      e2e: { count: 0, pattern: null },
    },
    coverage: { configured: false, thresholds: null, lastReport: null },
    scripts: {},
    ci: { platform: null, testJob: false },
  };

  const pkg = await readPkg(projectDir);
  if (pkg) {
    result.frameworks = await detectFrameworks(projectDir, pkg);
    result.scripts = detectTestScripts(pkg);
  }

  for (const fw of result.frameworks) {
    const counts = await countTestFiles(projectDir, fw.name);
    if (fw.name === "playwright" || fw.name === "cypress") {
      result.testFiles.e2e = {
        count: counts.count,
        pattern: counts.pattern,
        examples: counts.examples,
      };
    } else {
      result.testFiles.unit = {
        count: counts.count,
        pattern: counts.pattern,
        examples: counts.examples,
      };
    }
  }

  const integrationFiles = await findFiles(
    projectDir,
    "**/*.integration.test.{js,ts,jsx,tsx}",
  );
  result.testFiles.integration = {
    count: integrationFiles.length,
    pattern: "**/*.integration.test.*",
  };

  result.coverage = await detectCoverage(projectDir);
  result.ci = await detectCI(projectDir);

  return result;
}

async function readPkg(dir) {
  try {
    return await readJSON(path.join(dir, "package.json"));
  } catch {
    return null;
  }
}

async function detectFrameworks(dir, pkg) {
  const frameworks = [];
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  for (const [name, info] of Object.entries(RUNNER_DETECT_MAP)) {
    const hasDep = info.devDeps.some((d) => allDeps[d]);
    const hasConfig = await Promise.any(
      info.configs.map((c) =>
        fileExists(path.join(dir, c)).then((exists) =>
          exists ? c : Promise.reject(),
        ),
      ),
    ).catch(() => null);

    if (hasDep || hasConfig) {
      const version =
        info.devDeps.map((d) => allDeps[d]).find(Boolean) || "unknown";
      frameworks.push({ name, version, configFile: hasConfig || null });
    }
  }

  return frameworks;
}

function detectTestScripts(pkg) {
  const scripts = {};
  const s = pkg.scripts || {};
  if (s.test) scripts.test = `npm test`;
  if (s["test:watch"]) scripts.testWatch = `npm run test:watch`;
  if (s.testcov || s["test:coverage"])
    scripts.testCoverage = `npm run ${s.testcov ? "testcov" : "test:coverage"}`;
  if (s["test:e2e"]) scripts.testE2e = `npm run test:e2e`;
  return scripts;
}

async function countTestFiles(dir, runner) {
  const patterns = {
    jest: "**/*.test.{js,ts,jsx,tsx}",
    vitest: "**/*.{test,spec}.{js,ts,jsx,tsx}",
    playwright: "**/*.spec.{js,ts}",
    cypress: "**/*.cy.{js,ts,jsx,tsx}",
  };
  const pattern = patterns[runner] || "**/*.test.*";
  try {
    const files = await findFiles(dir, pattern);
    const filtered = files.filter((f) => !f.includes("node_modules"));
    return {
      count: filtered.length,
      pattern,
      examples: filtered.slice(0, 3).map((f) => path.relative(dir, f)),
    };
  } catch {
    return { count: 0, pattern, examples: [] };
  }
}

async function detectCoverage(dir) {
  const jestConfig = await readJestConfig(dir);
  if (jestConfig?.coverageThreshold) {
    return {
      configured: true,
      thresholds: jestConfig.coverageThreshold.global || null,
      lastReport: null,
    };
  }
  return { configured: false, thresholds: null, lastReport: null };
}

async function readJestConfig(dir) {
  const configPath = path.join(dir, "jest.config.js");
  if (!(await fileExists(configPath))) return null;
  try {
    const mod = await import(`file://${configPath}`);
    return mod.default || mod;
  } catch {
    return null;
  }
}

async function detectCI(dir) {
  if (await fileExists(path.join(dir, ".github", "workflows"))) {
    const files = await findFiles(
      path.join(dir, ".github", "workflows"),
      "*.{yml,yaml}",
    );
    return { platform: "github-actions", testJob: files.length > 0 };
  }
  if (await fileExists(path.join(dir, ".gitlab-ci.yml")))
    return { platform: "gitlab-ci", testJob: true };
  if (await fileExists(path.join(dir, "Jenkinsfile")))
    return { platform: "jenkins", testJob: true };
  if (await fileExists(path.join(dir, ".circleci")))
    return { platform: "circleci", testJob: true };
  return { platform: null, testJob: false };
}
