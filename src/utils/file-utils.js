import {
  readFile,
  writeFile as fsWriteFile,
  mkdir,
  readdir,
  stat,
  access,
} from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { glob } from "glob";

export async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function readJSON(filePath) {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content);
}

export async function writeJSON(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fsWriteFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function findFiles(dir, pattern) {
  return glob(pattern, { cwd: dir, absolute: true, nodir: true });
}

export async function getProjectRoot(startDir) {
  let current = startDir || process.cwd();
  while (current !== path.dirname(current)) {
    if (
      (await fileExists(path.join(current, "package.json"))) ||
      (await fileExists(path.join(current, ".git")))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir || process.cwd();
}

export async function safeReadFile(filePath) {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function listDirs(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
