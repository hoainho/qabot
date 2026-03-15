import ora from "ora";
import Enquirer from "enquirer";
import { logger } from "../../core/logger.js";
import { writeConfig } from "../../core/config.js";
import { analyzeProject } from "../../analyzers/project-analyzer.js";
import { detectTests } from "../../analyzers/test-detector.js";
import { detectFeatures } from "../../analyzers/feature-detector.js";
import { detectEnvironments } from "../../analyzers/env-detector.js";
import { DEFAULT_CONFIG } from "../../core/constants.js";

export function registerInitCommand(program) {
  program
    .command("init")
    .description("Initialize QABot for current project")
    .option("-y, --yes", "Accept all defaults without prompting")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(runInit);
}

async function runInit(options) {
  const projectDir = options.dir;
  const spinner = ora("Analyzing project...").start();

  try {
    const profile = await analyzeProject(projectDir);
    const testInfo = await detectTests(projectDir, profile);
    const features = await detectFeatures(projectDir, profile);
    const envInfo = await detectEnvironments(projectDir);
    spinner.succeed("Project analysis complete");

    logger.blank();
    logger.box("QABot - Project Analysis", [
      `Project:    ${profile.name}`,
      `Type:       ${profile.type}`,
      `Language:   ${profile.techStack.language}`,
      `Framework:  ${profile.techStack.framework || "none"}`,
      `Bundler:    ${profile.techStack.bundler || "none"}`,
      `State:      ${profile.techStack.stateManagement || "none"}`,
      `Auth:       ${profile.techStack.authProvider || "none"}`,
      `Pkg Mgr:    ${profile.packageManager}`,
      ``,
      `Test Frameworks: ${testInfo.frameworks.map((f) => f.name).join(", ") || "none"}`,
      `Unit Tests:      ${testInfo.testFiles.unit.count} files`,
      `E2E Tests:       ${testInfo.testFiles.e2e.count} files`,
      `Pages:           ${features.pages.length}`,
      `Features:        ${features.features.length}`,
      `Environments:    ${Object.keys(envInfo.environments).length}`,
    ]);

    const configData = buildConfigFromAnalysis(
      profile,
      testInfo,
      features,
      envInfo,
    );

    if (!options.yes) {
      const enquirer = new Enquirer();
      const { proceed } = await enquirer.prompt({
        type: "confirm",
        name: "proceed",
        message: "Generate qabot.config.json with these settings?",
        initial: true,
      });
      if (!proceed) {
        logger.warn("Cancelled. Run `qabot init` again to retry.");
        return;
      }
    }

    const configPath = await writeConfig(projectDir, configData);
    logger.blank();
    logger.success(`Config written to ${configPath}`);
    logger.blank();
    logger.info("Next steps:");
    logger.dim("  qabot list          - View detected features and test info");
    logger.dim("  qabot run           - Run all tests");
    logger.dim("  qabot run auth      - Run tests for a specific feature");
    logger.dim("  qabot generate auth - AI-generate tests for a feature");
    logger.blank();
  } catch (err) {
    spinner.fail("Analysis failed");
    logger.error(err.message);
    process.exit(1);
  }
}

function buildConfigFromAnalysis(profile, testInfo, features, envInfo) {
  const config = {
    project: { name: profile.name, type: profile.type },
    environments: {},
    layers: {},
    features: {},
    ...DEFAULT_CONFIG,
  };

  for (const [name, env] of Object.entries(envInfo.environments)) {
    config.environments[name] = { url: env.url || "" };
  }

  for (const fw of testInfo.frameworks) {
    if (fw.name === "playwright" || fw.name === "cypress") {
      config.layers.e2e = {
        runner: fw.name,
        command: `npx ${fw.name} test {pattern}`,
        testDir: "e2e/tests",
      };
    } else {
      config.layers.unit = {
        runner: fw.name,
        command: testInfo.scripts.test || `npx ${fw.name} {pattern}`,
        testMatch: testInfo.testFiles.unit.pattern || "**/*.test.*",
      };
    }
  }

  for (const f of features.features) {
    config.features[f.name] = { src: f.path, priority: "P1" };
  }
  for (const p of features.pages) {
    const name = p.name
      .replace(/^Page/, "")
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
    config.features[name] = { src: p.path, priority: "P1" };
  }

  if (profile.techStack.authProvider) {
    config.auth = {
      provider: profile.techStack.authProvider,
      credentials: { email: "E2E_TEST_EMAIL", password: "E2E_TEST_PASSWORD" },
    };
  }

  return config;
}
