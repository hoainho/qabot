import { cosmiconfig } from "cosmiconfig";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { DEFAULT_CONFIG, TOOL_NAME } from "./constants.js";

const explorer = cosmiconfig(TOOL_NAME, {
  searchPlaces: [
    "qabot.config.json",
    ".qabotrc.json",
    ".qabotrc",
    "qabot.config.mjs",
    "qabot.config.js",
    "qabot.config.cjs",
    "package.json",
  ],
});

export async function loadConfig(projectDir) {
  try {
    const result = await explorer.search(projectDir || process.cwd());
    if (!result || result.isEmpty) {
      return { config: { ...DEFAULT_CONFIG }, configPath: null, isEmpty: true };
    }
    const merged = deepMerge(DEFAULT_CONFIG, result.config);
    return { config: merged, configPath: result.filepath, isEmpty: false };
  } catch (err) {
    return {
      config: { ...DEFAULT_CONFIG },
      configPath: null,
      isEmpty: true,
      error: err.message,
    };
  }
}

export async function writeConfig(projectDir, configData) {
  const configPath = path.join(projectDir, "qabot.config.json");
  await writeFile(
    configPath,
    JSON.stringify(configData, null, 2) + "\n",
    "utf-8",
  );
  return configPath;
}

export function validateConfig(config) {
  const errors = [];
  if (!config.project?.name) errors.push("project.name is required");
  if (!config.project?.type) errors.push("project.type is required");
  if (config.layers) {
    for (const [layer, lc] of Object.entries(config.layers)) {
      if (!lc.runner) errors.push(`layers.${layer}.runner is required`);
      if (!lc.command) errors.push(`layers.${layer}.command is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
