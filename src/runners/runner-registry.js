import { JestRunner } from "./jest-runner.js";
import { VitestRunner } from "./vitest-runner.js";
import { PlaywrightRunner } from "./playwright-runner.js";
import { DotnetRunner } from "./dotnet-runner.js";
import { PytestRunner } from "./pytest-runner.js";

const RUNNERS = {
  jest: JestRunner,
  vitest: VitestRunner,
  playwright: PlaywrightRunner,
  cypress: PlaywrightRunner,
  "dotnet-test": DotnetRunner,
  dotnet: DotnetRunner,
  pytest: PytestRunner,
};

export function getRunner(name, config = {}) {
  const RunnerClass = RUNNERS[name];
  if (!RunnerClass)
    throw new Error(
      `Unknown runner: ${name}. Available: ${Object.keys(RUNNERS).join(", ")}`,
    );
  return new RunnerClass(config);
}

export function listRunners() {
  return Object.keys(RUNNERS);
}

export function isKnownRunner(name) {
  return name in RUNNERS;
}
