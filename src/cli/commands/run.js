import chalk from "chalk";
import { logger, formatMs } from "../../core/logger.js";
import { loadConfig } from "../../core/config.js";
import { analyzeProject } from "../../analyzers/project-analyzer.js";
import { TestExecutor } from "../../executor/test-executor.js";
import { ReportGenerator } from "../../reporter/report-generator.js";

export function registerRunCommand(program) {
  program
    .command("run [feature]")
    .description("Run tests for a feature or all features")
    .option(
      "-l, --layer <layers...>",
      "Test layers to run (unit, integration, e2e)",
    )
    .option(
      "-e, --env <environment>",
      "Target environment for E2E tests",
      "local",
    )
    .option("--coverage", "Generate coverage report")
    .option("--verbose", "Show detailed output")
    .option("--timeout <ms>", "Timeout per test suite in ms", "120000")
    .option("--no-report", "Skip report generation")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(runTests);
}

async function runTests(feature, options) {
  const projectDir = options.dir;
  const { config, isEmpty } = await loadConfig(projectDir);

  if (isEmpty) {
    logger.warn("No qabot.config.json found. Run `qabot init` first.");
    logger.dim("Or run tests with: qabot init -y && qabot run");
    return;
  }

  const profile = await analyzeProject(projectDir);

  const executor = new TestExecutor(config, profile);
  executor.onProgress(createProgressHandler(options.verbose));

  logger.header("QABot \u2014 Running Tests");
  logger.blank();
  logger.info(`Feature:     ${chalk.bold(feature || "all")}`);
  logger.info(`Environment: ${chalk.bold(options.env)}`);
  logger.info(
    `Layers:      ${chalk.bold((options.layer || Object.keys(config.layers || {})).join(", "))}`,
  );
  logger.blank();
  console.log(chalk.dim(`  ${"\u2500".repeat(50)}`));
  logger.blank();

  const startTime = Date.now();

  const collector = await executor.execute({
    feature: feature || "all",
    layers: options.layer,
    env: options.env,
    coverage: options.coverage,
    verbose: options.verbose,
    timeout: parseInt(options.timeout),
  });

  const totalDuration = Date.now() - startTime;
  const summary = collector.getSummary();

  logger.blank();
  console.log(chalk.dim(`  ${"\u2500".repeat(50)}`));
  logger.blank();

  const passColor = summary.totalFailed === 0 ? chalk.green : chalk.red;
  logger.info(
    `Summary: ${chalk.green(`${summary.totalPassed} passed`)}, ${summary.totalFailed > 0 ? chalk.red(`${summary.totalFailed} failed`) : `${summary.totalFailed} failed`}, ${chalk.yellow(`${summary.totalSkipped} skipped`)} ${chalk.dim(`(${formatMs(totalDuration)})`)}`,
  );

  if (options.report !== false) {
    try {
      const reporter = new ReportGenerator(config);
      const reportPaths = await reporter.generate(collector.toJSON(), {
        feature: feature || "all",
        environment: options.env,
        projectName: profile.name,
        timestamp: new Date().toISOString(),
        duration: totalDuration,
      });
      logger.info(`Report: ${chalk.underline(reportPaths.htmlPath)}`);
    } catch (err) {
      logger.warn(`Report generation failed: ${err.message}`);
    }
  }

  logger.blank();
  if (summary.totalFailed > 0) process.exit(1);
}

function createProgressHandler(verbose) {
  return (event) => {
    switch (event.type) {
      case "layer-start":
        logger.blank();
        logger.info(`${chalk.bold(event.runner)} (${event.layer})`);
        break;
      case "layer-skip":
        logger.dim(`  Skipping ${event.layer}: ${event.reason}`);
        break;
      case "test-pass":
        logger.testResult(event.test.name, "passed", event.test.duration);
        break;
      case "test-fail":
        logger.testResult(event.test.name, "failed", event.test.duration);
        if (event.test.error?.message) {
          logger.dim(
            `      ${chalk.red(event.test.error.message.split("\n")[0])}`,
          );
        }
        break;
      case "test-skip":
        if (verbose) logger.testResult(event.test.name, "skipped", 0);
        break;
      case "layer-end":
        logger.dim(
          `  ${event.summary.passed} passed, ${event.summary.failed} failed (${formatMs(event.duration)})`,
        );
        break;
      case "stdout":
        if (verbose) console.log(chalk.dim(`    ${event.line}`));
        break;
    }
  };
}
