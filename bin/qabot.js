#!/usr/bin/env node

import { Command } from "commander";
import { VERSION, TOOL_NAME } from "../src/core/constants.js";
import { registerInitCommand } from "../src/cli/commands/init.js";
import { registerRunCommand } from "../src/cli/commands/run.js";
import { registerListCommand } from "../src/cli/commands/list.js";
import { registerGenerateCommand } from "../src/cli/commands/generate.js";
import { registerReportCommand } from "../src/cli/commands/report.js";
import { registerAuthCommand } from "../src/cli/commands/auth.js";
import { registerTestCommand } from "../src/cli/commands/test.js";
import { runInteractive } from "../src/cli/interactive.js";

const hasSubcommand =
  process.argv.length > 2 && !process.argv[2].startsWith("-");

if (!hasSubcommand) {
  runInteractive(process.cwd())
    .then(async (result) => {
      if (!result) process.exit(0);

      switch (result.action) {
        case "init": {
          const { runInit } = await import("../src/cli/commands/init.js");
          if (typeof runInit === "function")
            await runInit({ yes: true, dir: process.cwd() });
          else process.argv.push("init", "-y");
          break;
        }
        case "report": {
          process.argv.push("report");
          break;
        }
        case "auth": {
          process.argv.push("auth");
          break;
        }
        case "e2e": {
          const args = ["test"];
          if (result.feature) args.push(result.feature);
          if (result.url) args.push("--url", result.url);
          if (result.headed) args.push("--headed");
          process.argv.push(...args);
          break;
        }
        case "unit": {
          const args = ["run"];
          if (result.feature) args.push(result.feature);
          args.push("--layer", "unit");
          process.argv.push(...args);
          break;
        }
        case "generate": {
          const args = ["generate"];
          if (result.feature) args.push(result.feature);
          process.argv.push(...args);
          break;
        }
        case "full": {
          const args = ["run"];
          if (result.feature) args.push(result.feature);
          process.argv.push(...args);
          break;
        }
      }

      if (process.argv.length > 2) {
        const program = buildProgram();
        program.parse();
      }
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
} else {
  const program = buildProgram();
  program.parse();
}

function buildProgram() {
  const program = new Command();
  program
    .name(TOOL_NAME)
    .description("AI-powered universal QA automation tool")
    .version(VERSION);

  registerInitCommand(program);
  registerRunCommand(program);
  registerTestCommand(program);
  registerListCommand(program);
  registerGenerateCommand(program);
  registerReportCommand(program);
  registerAuthCommand(program);

  return program;
}
