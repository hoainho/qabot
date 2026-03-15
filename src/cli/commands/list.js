import { logger } from "../../core/logger.js";
import { loadConfig } from "../../core/config.js";
import { analyzeProject } from "../../analyzers/project-analyzer.js";
import { detectTests } from "../../analyzers/test-detector.js";
import { detectFeatures } from "../../analyzers/feature-detector.js";
import { detectEnvironments } from "../../analyzers/env-detector.js";

export function registerListCommand(program) {
  program
    .command("list [type]")
    .description(
      "List detected project info (features, envs, layers, tests, all)",
    )
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(runList);
}

async function runList(type = "all", options) {
  const projectDir = options.dir;
  const { config, isEmpty } = await loadConfig(projectDir);
  const profile = await analyzeProject(projectDir);
  const testInfo = await detectTests(projectDir, profile);
  const features = await detectFeatures(projectDir, profile);
  const envInfo = await detectEnvironments(projectDir);

  const sections = {
    features: () => listFeatures(config, features),
    envs: () => listEnvironments(config, envInfo),
    layers: () => listLayers(config, testInfo),
    tests: () => listTests(testInfo),
    all: () => {
      listFeatures(config, features);
      listEnvironments(config, envInfo);
      listLayers(config, testInfo);
      listTests(testInfo);
    },
  };

  if (!sections[type]) {
    logger.error(
      `Unknown list type: ${type}. Use: features, envs, layers, tests, all`,
    );
    return;
  }

  logger.header(`QABot - ${type === "all" ? "Project Overview" : type}`);
  sections[type]();
  logger.blank();
}

function listFeatures(config, features) {
  logger.blank();
  logger.info("Features & Pages");
  const rows = [];
  if (config.features) {
    for (const [name, f] of Object.entries(config.features)) {
      rows.push([name, f.src || "-", f.priority || "P1"]);
    }
  } else {
    for (const f of features.features) rows.push([f.name, f.path, "P1"]);
    for (const p of features.pages) rows.push([p.name, p.path, "P1"]);
  }
  if (rows.length === 0) {
    logger.dim("No features detected");
    return;
  }
  logger.table(["Name", "Source Path", "Priority"], rows);
}

function listEnvironments(config, envInfo) {
  logger.blank();
  logger.info("Environments");
  const envs = config.environments || envInfo.environments;
  const rows = Object.entries(envs).map(([name, e]) => [
    name,
    e.url || "-",
    e.vpn ? "Yes" : "No",
  ]);
  if (rows.length === 0) {
    logger.dim("No environments detected");
    return;
  }
  logger.table(["Name", "URL", "VPN"], rows);
}

function listLayers(config, testInfo) {
  logger.blank();
  logger.info("Test Layers");
  const layers = config.layers || {};
  const rows = Object.entries(layers).map(([name, l]) => [
    name,
    l.runner || "-",
    l.command || "-",
  ]);
  if (rows.length === 0) {
    const fwRows = testInfo.frameworks.map((f) => [
      f.name,
      f.version,
      f.configFile || "-",
    ]);
    if (fwRows.length > 0)
      logger.table(["Framework", "Version", "Config"], fwRows);
    else logger.dim("No test layers configured");
    return;
  }
  logger.table(["Layer", "Runner", "Command"], rows);
}

function listTests(testInfo) {
  logger.blank();
  logger.info("Existing Tests");
  const rows = [
    [
      "Unit",
      String(testInfo.testFiles.unit.count),
      testInfo.testFiles.unit.pattern || "-",
    ],
    [
      "Integration",
      String(testInfo.testFiles.integration.count),
      testInfo.testFiles.integration.pattern || "-",
    ],
    [
      "E2E",
      String(testInfo.testFiles.e2e.count),
      testInfo.testFiles.e2e.pattern || "-",
    ],
  ];
  logger.table(["Layer", "Files", "Pattern"], rows);
}
