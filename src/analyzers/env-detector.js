import path from "node:path";
import { readdir } from "node:fs/promises";
import { safeReadFile, fileExists } from "../utils/file-utils.js";

export async function detectEnvironments(projectDir) {
  const result = { environments: {}, envFiles: [], variables: {} };

  result.envFiles = await findEnvFiles(projectDir);

  for (const envFile of result.envFiles) {
    const parsed = await parseEnvFile(path.join(projectDir, envFile));
    const envName = envNameFromFile(envFile);

    const urlVars = Object.entries(parsed).filter(
      ([k, v]) =>
        (k.includes("URL") ||
          k.includes("HOST") ||
          k.includes("BASE") ||
          k.includes("API")) &&
        (v.startsWith("http://") || v.startsWith("https://")),
    );

    if (urlVars.length > 0) {
      const [, url] = urlVars[0];
      result.environments[envName] = { url, source: envFile };
    }

    Object.assign(result.variables, parsed);
  }

  if (Object.keys(result.environments).length === 0) {
    const webpackEnvs = await detectWebpackEnvironments(projectDir);
    Object.assign(result.environments, webpackEnvs);
  }

  return result;
}

async function findEnvFiles(dir) {
  try {
    const entries = await readdir(dir);
    return entries
      .filter((e) => e.startsWith(".env") && !e.includes("example"))
      .sort();
  } catch {
    return [];
  }
}

async function parseEnvFile(filePath) {
  const content = await safeReadFile(filePath);
  if (!content) return {};

  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    vars[key] = value;
  }
  return vars;
}

function envNameFromFile(filename) {
  if (filename === ".env") return "default";
  const suffix = filename.replace(/^\.env\.?/, "");
  return suffix || "default";
}

async function detectWebpackEnvironments(dir) {
  const envs = {};
  try {
    const entries = await readdir(dir);
    const webpackConfigs = entries.filter(
      (e) =>
        e.startsWith("webpack.") &&
        e.endsWith(".js") &&
        e !== "webpack.base.babel.js",
    );

    for (const config of webpackConfigs) {
      const envName = config
        .replace("webpack.", "")
        .replace(".babel.js", "")
        .replace(".js", "");
      if (envName === "base" || envName === "common") continue;

      const content = await safeReadFile(path.join(dir, config));
      if (!content) continue;

      const urlMatch = content.match(
        /(?:BASE_URL|API_URL|SITE_URL|PUBLIC_URL)\s*[:=]\s*["'`](https?:\/\/[^"'`]+)["'`]/,
      );
      if (urlMatch) {
        envs[envName] = { url: urlMatch[1], source: config };
      } else {
        envs[envName] = { url: null, source: config };
      }
    }
  } catch {
    /* ignore */
  }
  return envs;
}
