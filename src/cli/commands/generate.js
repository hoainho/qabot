import chalk from "chalk";
import ora from "ora";
import path from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import Enquirer from "enquirer";
import { logger } from "../../core/logger.js";
import { loadConfig } from "../../core/config.js";
import { analyzeProject } from "../../analyzers/project-analyzer.js";
import { AIEngine } from "../../ai/ai-engine.js";
import { UseCaseParser } from "../../ai/usecase-parser.js";
import { findFiles, safeReadFile, ensureDir } from "../../utils/file-utils.js";

const MAX_FIX_ATTEMPTS = 3;

export function registerGenerateCommand(program) {
  program
    .command("generate [feature]")
    .description("Generate test cases and code using AI")
    .option("-l, --layer <layer>", "Target layer (unit, integration, e2e)")
    .option("--use-cases <dir>", "Directory containing use case documents")
    .option("--dry-run", "Show plan without writing files")
    .option("--no-fix", "Skip auto-fix loop")
    .option("--model <model>", "AI model to use")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(runGenerate);
}

async function runGenerate(feature, options) {
  const projectDir = options.dir;
  const { config, isEmpty } = await loadConfig(projectDir);

  if (isEmpty) {
    logger.warn("No qabot.config.json found. Run `qabot init` first.");
    return;
  }

  const aiConfig = { ...config.ai };
  if (options.model) aiConfig.model = options.model;

  const ai = new AIEngine(aiConfig);
  if (!ai.isAvailable()) {
    logger.error("AI is not configured.");
    logger.blank();
    logger.info("Quick setup:");
    logger.dim("  qabot auth");
    logger.blank();
    logger.info(
      "Supported: openai, anthropic, gemini, deepseek, groq, ollama, proxy",
    );
    return;
  }

  const profile = await analyzeProject(projectDir);
  logger.header("QABot \u2014 AI Test Generation");

  const featureConfig = config.features?.[feature];
  if (!featureConfig) {
    logger.error(
      `Feature "${feature}" not found. Run \`qabot list features\`.`,
    );
    return;
  }

  const spinner = ora("Reading source code...").start();

  const sourceFiles = await findFiles(
    projectDir,
    `${featureConfig.src}/**/*.{js,jsx,ts,tsx}`,
  );
  const sourceFilesFiltered = sourceFiles.filter(
    (f) => !f.includes("/tests/") && !f.includes(".test."),
  );
  const sourceCode = (
    await Promise.all(
      sourceFilesFiltered.slice(0, 10).map((f) => safeReadFile(f)),
    )
  )
    .filter(Boolean)
    .join("\n\n---\n\n");

  if (!sourceCode.trim()) {
    spinner.fail(`No source files found at ${featureConfig.src}`);
    return;
  }

  const existingTestFiles = await findFiles(
    projectDir,
    "src/**/tests/*.test.{js,jsx,ts,tsx}",
  );
  const existingTestCode =
    existingTestFiles.length > 0
      ? (await safeReadFile(existingTestFiles[0])) || ""
      : "";

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

  const runner = config.layers?.[options.layer || "unit"]?.runner || "jest";

  spinner.text = "AI is generating test plan...";

  let testPlan;
  try {
    testPlan = await ai.analyzeCode(sourceCode, {
      framework: profile.techStack.framework,
      runner,
      existingTestCount: existingTestFiles.length,
      useCases,
    });
  } catch (err) {
    spinner.fail("AI analysis failed");
    logger.error(err.message);
    return;
  }

  if (!Array.isArray(testPlan) || testPlan.length === 0) {
    spinner.fail("AI returned no test cases");
    return;
  }

  spinner.succeed(`Generated ${testPlan.length} test cases`);
  logger.blank();

  for (const tc of testPlan) {
    const icon =
      tc.priority === "P0"
        ? chalk.red("\u25cf")
        : tc.priority === "P1"
          ? chalk.yellow("\u25cf")
          : chalk.blue("\u25cf");
    console.log(`    ${icon} ${chalk.bold(tc.name)}`);
    logger.dim(`      Type: ${tc.type} | Priority: ${tc.priority}`);
  }

  if (options.dryRun) {
    logger.blank();
    logger.info("Dry run complete. No files written.");
    return;
  }

  logger.blank();
  const enquirer = new Enquirer();
  const { proceed } = await enquirer.prompt({
    type: "confirm",
    name: "proceed",
    message: `Generate test code for ${testPlan.length} test cases?`,
    initial: true,
  });
  if (!proceed) {
    logger.warn("Cancelled.");
    return;
  }

  const testsDir = path.join(projectDir, featureConfig.src, "tests");
  await ensureDir(testsDir);
  const testFileName = `${toPascalCase(feature)}.generated.test.js`;
  const testFilePath = path.join(testsDir, testFileName);
  const relativePath = path.relative(projectDir, testFilePath);

  const spinner2 = ora("AI is writing test code...").start();

  let code;
  try {
    code = await ai.generateTestCode(testPlan, {
      framework: profile.techStack.framework,
      runner,
      sourceCode,
      existingTestCode,
      importPath: `./${path.basename(featureConfig.src)}`,
    });
  } catch (err) {
    spinner2.fail("Code generation failed");
    logger.error(err.message);
    return;
  }

  code = cleanGeneratedCode(code);
  await writeFile(testFilePath, code, "utf-8");
  spinner2.succeed(`Test file written: ${chalk.underline(relativePath)}`);

  if (options.fix === false) {
    logger.blank();
    logger.info("Skipping auto-fix (--no-fix). Run manually:");
    logger.dim(`  qabot run ${feature}`);
    return;
  }

  logger.blank();
  logger.info("Running auto-fix loop...");

  const testCommand = config.layers?.unit?.command || "npx jest";

  for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
    logger.blank();
    logger.step(
      attempt,
      MAX_FIX_ATTEMPTS,
      `Attempt ${attempt}: running tests...`,
    );

    const { exitCode, error: testError } = runJestQuiet(
      projectDir,
      testFilePath,
      testCommand,
    );

    if (exitCode === 0) {
      logger.blank();
      logger.success(`Tests pass on attempt ${attempt}!`);
      logger.blank();
      logger.info("Run tests:");
      logger.dim(`  qabot run ${feature}`);
      return;
    }

    if (attempt >= MAX_FIX_ATTEMPTS) {
      logger.blank();
      logger.warn(`Tests still failing after ${MAX_FIX_ATTEMPTS} attempts.`);
      logger.dim("  Review and fix manually:");
      logger.dim(`  cat ${relativePath}`);
      logger.dim(`  qabot run ${feature} --verbose`);
      return;
    }

    logger.dim(`  Error: ${testError.split("\\n")[0].slice(0, 120)}`);
    logger.step(attempt, MAX_FIX_ATTEMPTS, "AI is fixing errors...");

    const currentCode = await readFile(testFilePath, "utf-8");
    try {
      let fixedCode = await ai.fixTestCode(currentCode, testError, {
        framework: profile.techStack.framework,
        runner,
      });
      fixedCode = cleanGeneratedCode(fixedCode);
      await writeFile(testFilePath, fixedCode, "utf-8");
      logger.dim("  Fix applied. Re-running...");
    } catch (err) {
      logger.warn(`  AI fix failed: ${err.message}`);
      break;
    }
  }
}

function runJestQuiet(projectDir, testFilePath, testCommand) {
  const relativePath = path.relative(projectDir, testFilePath);
  let cmd;
  if (testCommand.startsWith("npm")) {
    cmd = `${testCommand} -- --testPathPattern="${relativePath}" --no-coverage --forceExit`;
  } else {
    cmd = `npx jest --testPathPattern="${relativePath}" --no-coverage --forceExit`;
  }

  try {
    execSync(cmd, {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 60000,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { exitCode: 0, error: "" };
  } catch (err) {
    const stderr = err.stderr?.toString() || "";
    const stdout = err.stdout?.toString() || "";
    return {
      exitCode: err.status || 1,
      error: (stderr || stdout).slice(0, 3000),
    };
  }
}

function cleanGeneratedCode(code) {
  let cleaned = code.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(cleaned.indexOf("\n") + 1);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, cleaned.lastIndexOf("```"));
  }
  cleaned = cleaned.trim();

  const opens = (cleaned.match(/\{/g) || []).length;
  const closes = (cleaned.match(/\}/g) || []).length;
  const openParens = (cleaned.match(/\(/g) || []).length;
  const closeParens = (cleaned.match(/\)/g) || []).length;

  let suffix = "";
  for (let i = 0; i < openParens - closeParens; i++) suffix += ")";
  for (let i = 0; i < opens - closes; i++) suffix += "\n}";
  if (suffix) cleaned += suffix + ";\n";

  return cleaned + "\n";
}

function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}
