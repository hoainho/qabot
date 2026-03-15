import Enquirer from "enquirer";
import chalk from "chalk";
import { logger } from "../core/logger.js";
import { loadConfig } from "../core/config.js";
import { analyzeProject } from "../analyzers/project-analyzer.js";
import { VERSION } from "../core/constants.js";

const V = chalk.hex("#A78BFA");
const V2 = chalk.hex("#7C3AED");
const DIM = chalk.hex("#6B7280");
const W = chalk.hex("#F3F4F6");
const G = chalk.hex("#34D399");

export async function runInteractive(projectDir) {
  const enquirer = new Enquirer();
  const { config, isEmpty } = await loadConfig(projectDir);

  logger.banner();

  if (isEmpty) {
    logger.warn("No qabot.config.json found in this directory.");
    logger.blank();
    const { shouldInit } = await enquirer.prompt({
      type: "confirm",
      name: "shouldInit",
      message: V("Initialize QABot for this project?"),
      initial: true,
    });
    if (shouldInit) return { action: "init" };
    return null;
  }

  const profile = await analyzeProject(projectDir);
  const projectName = config.project?.name || profile.name;
  const allFeatures = Object.keys(config.features || {});

  console.log(DIM("  Project: ") + W(projectName));
  console.log(DIM("  Type:    ") + W(profile.type));
  console.log(
    DIM("  Tests:   ") + W(`${allFeatures.length} features detected`),
  );
  logger.blank();
  console.log(V2("  " + "\u2500".repeat(48)));
  logger.blank();

  const { testType } = await enquirer.prompt({
    type: "select",
    name: "testType",
    message: V("\u25C6") + W(" What would you like to do?"),
    pointer: V("\u25B8 "),
    choices: [
      {
        name: "e2e",
        message: `${G("\u25CF")} E2E Browser Test       ${DIM("Playwright automation on live app")}`,
      },
      {
        name: "unit",
        message: `${chalk.hex("#60A5FA")("\u25CF")} Unit Test              ${DIM("Jest / Vitest in terminal")}`,
      },
      {
        name: "generate",
        message: `${chalk.hex("#FBBF24")("\u25CF")} AI Generate + Run      ${DIM("AI writes tests, then runs them")}`,
      },
      {
        name: "full",
        message: `${chalk.hex("#C084FC")("\u25CF")} Full Suite             ${DIM("Unit + E2E combined")}`,
      },
      {
        name: "report",
        message: `${chalk.hex("#22D3EE")("\u25CF")} View Report            ${DIM("Open last HTML report")}`,
      },
      {
        name: "auth",
        message: `${DIM("\u25CF")} Configure AI Provider  ${DIM("Setup OpenAI/Claude/Proxy")}`,
      },
    ],
  });

  if (testType === "report") return { action: "report" };
  if (testType === "auth") return { action: "auth" };

  logger.blank();

  const featureChoices = [
    {
      name: "__all__",
      message: chalk.bold("All features") + DIM(` (${allFeatures.length})`),
    },
    ...allFeatures.slice(0, 30).map((f) => {
      const src = config.features[f]?.src || "";
      const priority = config.features[f]?.priority || "";
      const pColor =
        priority === "P0"
          ? chalk.hex("#F87171")
          : priority === "P1"
            ? chalk.hex("#FBBF24")
            : DIM;
      return {
        name: f,
        message: `${pColor(priority || "  ")} ${W(f)} ${DIM(src)}`,
      };
    }),
  ];

  const { feature } = await enquirer.prompt({
    type: "select",
    name: "feature",
    message: V("\u25C6") + W(" Select feature"),
    pointer: V("\u25B8 "),
    choices: featureChoices,
    limit: 18,
  });

  const selectedFeature = feature === "__all__" ? null : feature;

  let targetUrl = null;
  let headed = false;

  if (testType === "e2e" || testType === "full") {
    logger.blank();

    const envEntries = Object.entries(config.environments || {});
    const envChoices = envEntries.map(([name, env]) => ({
      name: env.url || name,
      message: `${V("\u25CF")} ${W(name.padEnd(16))} ${DIM(env.url || "")}`,
    }));
    envChoices.push({
      name: "__custom__",
      message: `${chalk.hex("#FBBF24")("\u25CF")} ${W("Custom URL")}        ${DIM("Enter URL manually")}`,
    });

    const { envUrl } = await enquirer.prompt({
      type: "select",
      name: "envUrl",
      message: V("\u25C6") + W(" Target environment"),
      pointer: V("\u25B8 "),
      choices: envChoices,
      limit: 12,
    });

    if (envUrl === "__custom__") {
      const { customUrl } = await enquirer.prompt({
        type: "input",
        name: "customUrl",
        message: V("\u25C6") + W(" Enter URL"),
        validate: (v) =>
          v.startsWith("http")
            ? true
            : "URL must start with http:// or https://",
      });
      targetUrl = customUrl;
    } else {
      targetUrl = envUrl;
    }

    logger.blank();

    const { browserMode } = await enquirer.prompt({
      type: "select",
      name: "browserMode",
      message: V("\u25C6") + W(" Browser mode"),
      pointer: V("\u25B8 "),
      choices: [
        {
          name: "headless",
          message: `${DIM("\u25CF")} Headless       ${DIM("Fast, runs in background")}`,
        },
        {
          name: "headed",
          message: `${G("\u25CF")} Headed         ${DIM("Watch the browser live")}`,
        },
      ],
    });
    headed = browserMode === "headed";
  }

  logger.blank();
  console.log(V2("  " + "\u2500".repeat(48)));
  logger.blank();

  const summary = [];
  summary.push(DIM("  Action:  ") + V(testType.toUpperCase()));
  summary.push(DIM("  Feature: ") + W(selectedFeature || "all"));
  if (targetUrl)
    summary.push(DIM("  URL:     ") + chalk.hex("#22D3EE")(targetUrl));
  if (testType === "e2e" || testType === "full")
    summary.push(
      DIM("  Browser: ") + W(headed ? "Headed (visible)" : "Headless"),
    );
  summary.forEach((l) => console.log(l));
  logger.blank();

  const { confirm } = await enquirer.prompt({
    type: "confirm",
    name: "confirm",
    message: V("\u25C6") + G(" Ready to run?"),
    initial: true,
  });

  if (!confirm) {
    logger.dim("Cancelled.");
    return null;
  }

  return {
    action: testType,
    feature: selectedFeature,
    url: targetUrl,
    headed,
  };
}
