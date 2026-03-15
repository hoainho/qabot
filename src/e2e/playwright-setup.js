import path from "node:path";
import { execSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileExists, ensureDir } from "../utils/file-utils.js";

export async function ensurePlaywright(projectDir) {
  const pwBin = path.join(projectDir, "node_modules", ".bin", "playwright");

  if (!(await fileExists(pwBin))) {
    execSync("npm install -D @playwright/test", {
      cwd: projectDir,
      stdio: "pipe",
    });
  }

  try {
    execSync("npx playwright install chromium", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 120000,
    });
  } catch {
    execSync("npx playwright install", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 120000,
    });
  }

  return true;
}

export async function ensureE2EStructure(projectDir) {
  const dirs = [
    "e2e/tests",
    "e2e/pages",
    "e2e/helpers",
    "e2e/.auth",
    "e2e/screenshots",
  ];
  for (const dir of dirs) {
    await ensureDir(path.join(projectDir, dir));
  }
}

export async function writePlaywrightConfig(projectDir, config) {
  const configPath = path.join(projectDir, "e2e", "playwright.config.js");
  if (await fileExists(configPath)) return configPath;

  const envUrls = {};
  if (config.environments) {
    for (const [name, env] of Object.entries(config.environments)) {
      if (env.url) envUrls[name] = env.url;
    }
  }

  const content = `const { defineConfig, devices } = require("@playwright/test");

const ENV_URLS = ${JSON.stringify(envUrls, null, 2)};

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ["html", { open: "never", outputFolder: "../qabot-reports/playwright" }],
    ["json", { outputFile: "../qabot-reports/playwright/results.json" }],
  ],
  use: {
    baseURL: ENV_URLS[process.env.E2E_ENV || "default"] || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "on",
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
`;

  await writeFile(configPath, content, "utf-8");
  return configPath;
}

export async function writeAuthHelper(projectDir, config) {
  const helperPath = path.join(projectDir, "e2e", "helpers", "auth.js");
  if (await fileExists(helperPath)) return;

  const authProvider = config.auth?.provider || "none";
  const content = `const { expect } = require("@playwright/test");

async function login(page, baseURL) {
  const email = process.env.E2E_TEST_EMAIL || "";
  const password = process.env.E2E_TEST_PASSWORD || "";

  if (!email || !password) {
    console.warn("E2E_TEST_EMAIL or E2E_TEST_PASSWORD not set — skipping login");
    return;
  }

  await page.goto(baseURL || "/");
  await page.waitForLoadState("networkidle");

  ${
    authProvider === "auth0"
      ? `
  const signInBtn = page.getByRole("button", { name: /sign in/i })
    .or(page.getByRole("link", { name: /sign in/i }))
    .or(page.locator("[data-testid='sign-in-button']"));
  
  if (await signInBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signInBtn.click();
    await page.waitForLoadState("networkidle");
  }

  const emailInput = page.getByLabel(/email/i).or(page.locator("input[name='email']")).or(page.locator("input[type='email']"));
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(email);
    const passwordInput = page.getByLabel(/password/i).or(page.locator("input[name='password']")).or(page.locator("input[type='password']"));
    await passwordInput.fill(password);
    const submitBtn = page.getByRole("button", { name: /continue|log in|sign in|submit/i });
    await submitBtn.click();
    await page.waitForLoadState("networkidle");
  }`
      : `
  // Generic login — customize for your auth provider
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|submit/i }).click();
  await page.waitForLoadState("networkidle");`
  }
}

module.exports = { login };
`;

  await writeFile(helperPath, content, "utf-8");
}
