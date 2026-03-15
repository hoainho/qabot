import chalk from "chalk";
import ora from "ora";
import path from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { execSync, spawn } from "node:child_process";
import Enquirer from "enquirer";
import { logger, formatMs } from "../../core/logger.js";
import { loadConfig } from "../../core/config.js";
import { analyzeProject } from "../../analyzers/project-analyzer.js";
import { AIEngine } from "../../ai/ai-engine.js";
import { UseCaseParser } from "../../ai/usecase-parser.js";
import {
  ensurePlaywright,
  ensureE2EStructure,
  writePlaywrightConfig,
  writeAuthHelper,
} from "../../e2e/playwright-setup.js";
import { generateE2ESpec, fixE2ESpec } from "../../e2e/e2e-generator.js";
import {
  findFiles,
  safeReadFile,
  ensureDir,
  fileExists,
} from "../../utils/file-utils.js";
import { ReportGenerator } from "../../reporter/report-generator.js";

const V = chalk.hex("#A78BFA");
const V2 = chalk.hex("#7C3AED");
const DIM = chalk.hex("#6B7280");
const W = chalk.hex("#F3F4F6");
const G = chalk.hex("#34D399");
const R = chalk.hex("#F87171");
const Y = chalk.hex("#FBBF24");

const MAX_FIX_ATTEMPTS = 3;

export function registerTestCommand(program) {
  program
    .command("test [feature]")
    .description("Run E2E automation tests (Playwright)")
    .option("-e, --env <environment>", "Target environment", "default")
    .option("--headed", "Run browser in headed mode (visible)")
    .option("--no-fix", "Skip auto-fix on failure")
    .option("--skip-gen", "Skip test generation, run existing specs only")
    .option("-u, --url <url>", "Target URL (overrides environment config)")
    .option("--use-cases <dir>", "Directory containing use case documents")
    .option("--model <model>", "AI model to use")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(runTest);
}

async function runTest(feature, options) {
  const projectDir = options.dir;
  const { config, isEmpty } = await loadConfig(projectDir);

  if (isEmpty) {
    logger.warn("No qabot.config.json found. Run `qabot init` first.");
    return;
  }

  const profile = await analyzeProject(projectDir);
  const envConfig =
    config.environments?.[options.env] || config.environments?.default;
  const baseUrl = options.url || envConfig?.url || "http://localhost:3000";

  logger.header("E2E Automation Test");
  logger.blank();
  console.log(DIM("  Feature: ") + W(feature || "all"));
  console.log(DIM("  Target:  ") + chalk.hex("#22D3EE")(baseUrl));
  console.log(DIM("  Browser: ") + W(options.headed ? "Headed" : "Headless"));
  logger.blank();

  const spinner = ora({
    text: V(" Setting up Playwright..."),
    spinner: "dots",
  }).start();
  try {
    await ensurePlaywright(projectDir);
    await ensureE2EStructure(projectDir);
    await writePlaywrightConfig(projectDir, config);
    await writeAuthHelper(projectDir, config);
    spinner.succeed(G(" Playwright ready"));
  } catch (err) {
    spinner.fail(R(` Setup failed: ${err.message}`));
    return;
  }

  const featureConfig = feature ? config.features?.[feature] : null;
  const specDir = path.join(projectDir, "e2e", "tests");
  let specFile;

  if (options.skipGen) {
    const existing = await findFiles(specDir, "*.spec.js");
    if (existing.length === 0) {
      logger.error("No existing E2E specs found. Run without --skip-gen.");
      return;
    }
    specFile = feature
      ? existing.find((f) => f.toLowerCase().includes(feature.toLowerCase()))
      : null;
  } else {
    if (!feature) {
      logger.error("Feature name required. Usage: qabot test <feature>");
      return;
    }

    const aiConfig = { ...config.ai };
    if (options.model) aiConfig.model = options.model;
    const ai = new AIEngine(aiConfig);

    if (!ai.isAvailable()) {
      logger.error("AI not configured. Run `qabot auth` first.");
      return;
    }

    const spinner2 = ora({
      text: V(" AI analyzing feature..."),
      spinner: "dots",
    }).start();

    let sourceCode = "";
    if (featureConfig?.src) {
      const sourceFiles = await findFiles(
        projectDir,
        `${featureConfig.src}/**/*.{js,jsx,ts,tsx}`,
      );
      const filtered = sourceFiles.filter(
        (f) => !f.includes("/tests/") && !f.includes(".test."),
      );
      sourceCode = (
        await Promise.all(filtered.slice(0, 8).map((f) => safeReadFile(f)))
      )
        .filter(Boolean)
        .join("\n\n---\n\n");
    }

    let useCases = [];
    const useCaseDir = options.useCases || config.useCases?.dir;
    if (useCaseDir) {
      const parser = new UseCaseParser();
      const ucFiles = await findFiles(
        projectDir,
        `${useCaseDir}/**/*.{md,feature,txt}`,
      );
      for (const f of ucFiles) {
        try {
          useCases.push(...(await parser.parse(f)));
        } catch {
          /* skip */
        }
      }
    }

    const route = featureConfig?.route || guessRoute(feature);

    try {
      const spec = await generateE2ESpec(ai, feature, {
        baseUrl,
        sourceCode,
        route,
        authProvider: config.auth?.provider || "none",
        useCases,
      });
      specFile = path.join(specDir, `${feature}.spec.js`);
      await writeFile(specFile, spec, "utf-8");
      spinner2.succeed(
        G(` E2E spec: ${chalk.underline(path.relative(projectDir, specFile))}`),
      );
    } catch (err) {
      spinner2.fail(R(` Generation failed: ${err.message}`));
      return;
    }

    if (options.fix !== false) {
      for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
        logger.blank();
        logger.step(attempt, MAX_FIX_ATTEMPTS, `Attempt ${attempt}`);
        logger.blank();

        const result = await runPlaywrightStreaming(
          projectDir,
          specFile,
          options,
          baseUrl,
        );

        if (result.exitCode === 0) {
          logger.summary(
            result.passed,
            result.failed,
            result.skipped,
            result.duration,
          );
          if (result.passed > 0)
            logger.success(`E2E passed on attempt ${attempt}`);
          await generateE2EReport(
            projectDir,
            config,
            feature,
            options.env,
            baseUrl,
            result,
          );
          return;
        }

        if (attempt >= MAX_FIX_ATTEMPTS) {
          logger.summary(
            result.passed,
            result.failed,
            result.skipped,
            result.duration,
          );
          logger.warn(`Still failing after ${MAX_FIX_ATTEMPTS} attempts`);
          logger.dim(`Review: cat ${path.relative(projectDir, specFile)}`);
          logger.dim(`Debug:  qabot test ${feature} --headed`);
          await generateE2EReport(
            projectDir,
            config,
            feature,
            options.env,
            baseUrl,
            result,
          );
          return;
        }

        const fixSpinner = ora({
          text: V(" AI fixing errors..."),
          spinner: "dots",
        }).start();
        try {
          const currentCode = await readFile(specFile, "utf-8");
          const fixedCode = await fixE2ESpec(ai, currentCode, result.rawError, {
            baseUrl,
            authProvider: config.auth?.provider,
          });
          await writeFile(specFile, fixedCode, "utf-8");
          fixSpinner.succeed(G(" Fix applied"));
        } catch (err) {
          fixSpinner.fail(R(` Fix failed: ${err.message}`));
          break;
        }
      }
      return;
    }
  }

  if (!specFile && !options.skipGen) return;

  logger.section("Running E2E");
  const result = await runPlaywrightStreaming(
    projectDir,
    specFile,
    options,
    baseUrl,
  );
  logger.summary(result.passed, result.failed, result.skipped, result.duration);
  await generateE2EReport(
    projectDir,
    config,
    feature || "all",
    options.env,
    baseUrl,
    result,
  );
  if (result.failed > 0) process.exit(1);
}

function runPlaywrightStreaming(projectDir, specFile, options, baseUrl) {
  return new Promise((resolve) => {
    const configPath = path.join(projectDir, "e2e", "playwright.config.js");
    const args = ["playwright", "test"];
    if (specFile)
      args.push(path.relative(path.join(projectDir, "e2e"), specFile));
    args.push(
      `--config=${configPath}`,
      "--project=chromium",
      "--reporter=line",
    );
    if (options.headed) args.push("--headed");

    const env = {
      ...process.env,
      E2E_ENV: options.env || "default",
      BASE_URL: baseUrl,
      FORCE_COLOR: "1",
    };

    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let testIndex = 0;

    const child = spawn("npx", args, {
      cwd: projectDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;

      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (
          trimmed.includes("\u2713") ||
          trimmed.includes("passed") ||
          trimmed.match(/\[.*\].*ok/i)
        ) {
          testIndex++;
          passed++;
          const name = extractTestName(trimmed);
          logger.testResult(name, "passed", extractDuration(trimmed));
        } else if (
          trimmed.includes("\u2717") ||
          trimmed.includes("failed") ||
          trimmed.includes("FAIL")
        ) {
          testIndex++;
          failed++;
          const name = extractTestName(trimmed);
          logger.testResult(name, "failed", extractDuration(trimmed));
        } else if (trimmed.includes("skipped")) {
          testIndex++;
          skipped++;
          const name = extractTestName(trimmed);
          logger.testResult(name, "skipped", 0);
        } else if (trimmed.match(/Running \d+ test/)) {
          logger.dim(trimmed);
        } else if (trimmed.includes("Error") || trimmed.includes("expect")) {
          logger.dim(R(`     ${trimmed.slice(0, 120)}`));
        }
      }
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (exitCode) => {
      const duration = Date.now() - startTime;
      resolve({
        exitCode: exitCode ?? 1,
        passed,
        failed,
        skipped,
        duration,
        stdout,
        stderr,
        rawError: (stderr || stdout).slice(0, 4000),
        tests: [],
      });
    });
  });
}

function extractTestName(line) {
  const cleaned = line
    .replace(/\u2713|\u2717|\u25CB/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(\d+(\.\d+)?[ms]+\)/g, "")
    .replace(/›/g, " > ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" > ");
  return parts[parts.length - 1] || cleaned;
}

function extractDuration(line) {
  const match = line.match(/\((\d+(?:\.\d+)?)(ms|s|m)\)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  if (match[2] === "s") return val * 1000;
  if (match[2] === "m") return val * 60000;
  return val;
}

function guessRoute(featureName) {
  const routes = {
    home: "/",
    lobby: "/lobby",
    auth: "/signin",
    account: "/account",
    redemption: "/redemption",
    "refer-a-friend": "/refer-a-friend",
    faq: "/faq",
    promotions: "/promotions",
    "game-details": "/game-details",
    "game-zone": "/game-zone",
    "privacy-policy": "/privacy-policy",
    "terms-of-service": "/terms-of-service",
  };
  return routes[featureName] || `/${featureName}`;
}

async function generateE2EReport(
  projectDir,
  config,
  feature,
  env,
  baseUrl,
  result,
) {
  try {
    const reporter = new ReportGenerator(config);
    const tests = result.tests || [];
    const results = {
      summary: {
        totalTests: result.passed + result.failed + result.skipped,
        totalPassed: result.passed,
        totalFailed: result.failed,
        totalSkipped: result.skipped,
        overallPassRate:
          result.passed + result.failed + result.skipped > 0
            ? Math.round(
                (result.passed /
                  (result.passed + result.failed + result.skipped)) *
                  100,
              )
            : 0,
        totalDuration: result.duration,
        byLayer: {
          e2e: {
            total: result.passed + result.failed + result.skipped,
            passed: result.passed,
            failed: result.failed,
            skipped: result.skipped,
          },
        },
      },
      results: [
        {
          runner: "playwright",
          layer: "e2e",
          feature,
          tests,
          summary: {
            total: result.passed + result.failed + result.skipped,
            passed: result.passed,
            failed: result.failed,
            skipped: result.skipped,
          },
        },
      ],
    };

    const reportPaths = await reporter.generate(results, {
      feature,
      environment: env,
      projectName: config.project?.name || "unknown",
      timestamp: new Date().toISOString(),
      duration: result.duration,
    });

    logger.info(`Report: ${chalk.underline(reportPaths.htmlPath)}`);
  } catch {
    /* best-effort */
  }
}
