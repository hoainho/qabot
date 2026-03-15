export const VERSION = "1.0.1";
export const TOOL_NAME = "qabot";

export const PROJECT_TYPES = [
  "react-spa",
  "nextjs",
  "vue",
  "angular",
  "dotnet",
  "python",
  "node",
  "unknown",
];
export const RUNNERS = [
  "jest",
  "vitest",
  "playwright",
  "cypress",
  "pytest",
  "xunit",
  "dotnet-test",
];
export const AI_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "deepseek",
  "groq",
  "ollama",
  "proxy",
  "none",
];

export const AI_PROVIDER_DEFAULTS = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    authHeader: "x-api-key",
    authPrefix: "",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
    authHeader: "x-goog-api-key",
    authPrefix: "",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama3",
    authHeader: null,
    authPrefix: "",
  },
  proxy: {
    baseUrl: "",
    model: "",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
};
export const LAYERS = ["unit", "integration", "e2e"];
export const PRIORITIES = ["P0", "P1", "P2", "P3"];

export const TEST_STATUS = {
  PASSED: "passed",
  FAILED: "failed",
  SKIPPED: "skipped",
  PENDING: "pending",
  RUNNING: "running",
};

export const DEFAULT_CONFIG = {
  reporting: {
    outputDir: "./qabot-reports",
    openAfterRun: true,
    history: true,
    formats: ["html", "json"],
  },
  ai: {
    provider: "none",
    model: "gpt-4o",
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrl: null,
    authHeader: null,
    authPrefix: null,
  },
  useCases: { dir: "./docs/use-cases", formats: ["md", "feature", "txt"] },
};

export const FRAMEWORK_DETECT_MAP = {
  react: { deps: ["react", "react-dom"], type: "react-spa" },
  next: { deps: ["next"], type: "nextjs" },
  vue: { deps: ["vue"], type: "vue" },
  angular: { deps: ["@angular/core"], type: "angular" },
};

export const RUNNER_DETECT_MAP = {
  jest: {
    devDeps: ["jest", "jest-cli", "@jest/core"],
    configs: ["jest.config.js", "jest.config.ts", "jest.config.mjs"],
  },
  vitest: {
    devDeps: ["vitest"],
    configs: ["vitest.config.js", "vitest.config.ts", "vitest.config.mjs"],
  },
  playwright: {
    devDeps: ["@playwright/test", "playwright"],
    configs: ["playwright.config.js", "playwright.config.ts"],
  },
  cypress: {
    devDeps: ["cypress"],
    configs: ["cypress.config.js", "cypress.config.ts"],
  },
};
