import Enquirer from "enquirer";
import chalk from "chalk";
import { logger } from "../../core/logger.js";
import { loadConfig, writeConfig } from "../../core/config.js";
import { AI_PROVIDERS, AI_PROVIDER_DEFAULTS } from "../../core/constants.js";
import { AIEngine } from "../../ai/ai-engine.js";

export function registerAuthCommand(program) {
  program
    .command("auth")
    .description("Configure AI provider for test generation")
    .option("--test", "Test current AI configuration")
    .option("--show", "Show current AI configuration")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(runAuth);
}

async function runAuth(options) {
  const projectDir = options.dir;
  const { config, isEmpty } = await loadConfig(projectDir);

  if (options.show) {
    showCurrentConfig(config);
    return;
  }

  if (options.test) {
    await testConnection(config);
    return;
  }

  await interactiveSetup(projectDir, config, isEmpty);
}

function showCurrentConfig(config) {
  const ai = config.ai || {};
  const engine = new AIEngine(ai);
  const info = engine.getProviderInfo();

  logger.header("QABot \u2014 AI Configuration");
  logger.blank();
  logger.table(
    ["Setting", "Value"],
    [
      ["Provider", info.provider || "none"],
      ["Model", info.model || "(proxy default)"],
      ["Base URL", info.baseUrl || "(default)"],
      [
        "API Key",
        info.hasApiKey ? `\u2713 ${info.apiKeyPreview}` : "\u2717 missing",
      ],
      ["Auth Header", engine.authHeader || "(none)"],
      [
        "Key Source",
        ai.apiKey
          ? "config (apiKey)"
          : ai.apiKeyEnv
            ? `env ($${ai.apiKeyEnv})`
            : "auto-detect",
      ],
      ["Available", engine.isAvailable() ? "\u2713 yes" : "\u2717 no"],
    ],
  );
  logger.blank();

  if (!engine.isAvailable()) {
    logger.warn("AI is not available. To fix:");
    if (info.provider === "proxy") {
      logger.dim("  Option 1: Set apiKey directly in qabot.config.json:");
      logger.dim('    "ai": { "apiKey": "your-key", ... }');
      logger.dim(
        `  Option 2: Set env var: export ${ai.apiKeyEnv || "PROXY_API_KEY"}=your-key`,
      );
      logger.dim(
        "  Option 3: Remove auth requirement if proxy doesn't need it:",
      );
      logger.dim('    "ai": { "authHeader": null, ... }');
    } else {
      logger.dim("  Run: qabot auth");
    }
    logger.blank();
  }
}

async function testConnection(config) {
  const ai = config.ai || {};
  const engine = new AIEngine(ai);

  if (!engine.isAvailable()) {
    logger.error("AI is not configured. Run `qabot auth` to set up.");
    return;
  }

  const info = engine.getProviderInfo();
  logger.info(`Testing connection to ${chalk.bold(engine.provider)}...`);
  logger.blank();
  logger.dim(`  Provider:    ${info.provider}`);
  logger.dim(`  Model:       ${info.model || "(none)"}`);
  logger.dim(`  Base URL:    ${info.baseUrl}`);
  logger.dim(
    `  API Key:     ${info.hasApiKey ? info.apiKeyPreview : "(none)"}`,
  );
  logger.dim(`  Auth Header: ${engine.authHeader || "(none)"}`);
  logger.blank();

  try {
    const response = await engine.complete("Reply with exactly: QABOT_OK");
    if (response.includes("QABOT_OK")) {
      logger.success(
        `Connection successful! Provider: ${engine.provider}, Model: ${engine.model}`,
      );
    } else {
      logger.success(
        `Got response from ${engine.provider} (model may not follow simple instructions exactly)`,
      );
      logger.dim(`Response: ${response.slice(0, 100)}`);
    }
  } catch (err) {
    logger.error(`Connection failed: ${err.message}`);
    logger.blank();
    logger.info("Troubleshooting:");
    if (err.message.includes("401") || err.message.includes("auth")) {
      logger.dim("  1. Check API key is correct");
      logger.dim(
        `  2. Verify env var: echo $${ai.apiKeyEnv || "PROXY_API_KEY"}`,
      );
      logger.dim("  3. Or set apiKey directly in qabot.config.json:");
      logger.dim('     "ai": { "apiKey": "your-key-here", ... }');
    }
    if (
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("connect")
    ) {
      logger.dim(`  1. Check server is running at ${info.baseUrl}`);
      logger.dim("  2. Verify URL is correct in qabot.config.json");
    }
    if (err.message.includes("500")) {
      logger.dim("  1. Server error — check proxy/LLM server logs");
      logger.dim("  2. Model name may be wrong — verify ai.model in config");
      logger.dim(
        `  3. Try: curl -X POST ${info.baseUrl} -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hi"}]}'`,
      );
    }
  }
}

async function interactiveSetup(projectDir, config, isEmpty) {
  const enquirer = new Enquirer();

  logger.header("QABot \u2014 AI Provider Setup");
  logger.blank();

  const providerChoices = [
    { name: "openai", message: "OpenAI        (GPT-4o, GPT-4-turbo)" },
    { name: "anthropic", message: "Anthropic     (Claude 4, Claude Sonnet)" },
    { name: "gemini", message: "Google Gemini (Gemini 2.5 Flash/Pro)" },
    { name: "deepseek", message: "DeepSeek      (DeepSeek-V3, DeepSeek-Chat)" },
    { name: "groq", message: "Groq          (LLaMA 3.3, Mixtral)" },
    { name: "ollama", message: "Ollama        (Local models, no API key)" },
    {
      name: "proxy",
      message: "Custom Proxy  (Any OpenAI-compatible endpoint)",
    },
  ];

  const { provider } = await enquirer.prompt({
    type: "select",
    name: "provider",
    message: "Select AI provider",
    choices: providerChoices,
  });

  const defaults = AI_PROVIDER_DEFAULTS[provider] || {};
  const aiConfig = { provider };

  if (provider === "proxy") {
    const proxyAnswers = await enquirer.prompt([
      {
        type: "input",
        name: "baseUrl",
        message:
          "Proxy URL (full endpoint, e.g. https://my-proxy.com/v1/chat/completions)",
        validate: (v) =>
          v.startsWith("http")
            ? true
            : "Must be a valid URL starting with http",
      },
      {
        type: "input",
        name: "apiKey",
        message: "API Key (leave empty if not required)",
      },
      {
        type: "input",
        name: "model",
        message: "Model name (leave empty for proxy default)",
      },
      {
        type: "select",
        name: "authMethod",
        message: "Authentication method",
        choices: [
          {
            name: "bearer",
            message: "Bearer Token  (Authorization: Bearer <key>)",
          },
          { name: "x-api-key", message: "X-API-Key     (x-api-key: <key>)" },
          { name: "custom", message: "Custom Header" },
          { name: "none", message: "No Auth" },
        ],
      },
    ]);

    aiConfig.baseUrl = proxyAnswers.baseUrl;
    aiConfig.model = proxyAnswers.model || "";

    if (proxyAnswers.authMethod === "bearer") {
      aiConfig.authHeader = "Authorization";
      aiConfig.authPrefix = "Bearer ";
    } else if (proxyAnswers.authMethod === "x-api-key") {
      aiConfig.authHeader = "x-api-key";
      aiConfig.authPrefix = "";
    } else if (proxyAnswers.authMethod === "custom") {
      const { customHeader } = await enquirer.prompt({
        type: "input",
        name: "customHeader",
        message: "Custom header name (e.g. X-Custom-Auth)",
      });
      aiConfig.authHeader = customHeader;
      aiConfig.authPrefix = "";
    } else {
      aiConfig.authHeader = null;
    }

    if (proxyAnswers.apiKey) {
      aiConfig.apiKey = proxyAnswers.apiKey;
      aiConfig.apiKeyEnv = "PROXY_API_KEY";
    }
  } else if (provider === "ollama") {
    const { baseUrl, model } = await enquirer.prompt([
      {
        type: "input",
        name: "baseUrl",
        message: "Ollama URL",
        initial: defaults.baseUrl,
      },
      {
        type: "input",
        name: "model",
        message: "Model name",
        initial: defaults.model,
      },
    ]);
    aiConfig.baseUrl = baseUrl;
    aiConfig.model = model;
  } else {
    const envMap = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      gemini: "GEMINI_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      groq: "GROQ_API_KEY",
    };

    const envName = envMap[provider];

    const answers = await enquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Model name",
        initial: defaults.model,
      },
      {
        type: "password",
        name: "apiKey",
        message: `API Key (${envName})`,
      },
    ]);

    aiConfig.model = answers.model;
    aiConfig.apiKeyEnv = envName;
    if (answers.apiKey) {
      aiConfig.apiKey = answers.apiKey;
    }
  }

  config.ai = aiConfig;

  if (isEmpty) {
    logger.blank();
    logger.warn(
      "No qabot.config.json found. Run `qabot init` first, then `qabot auth`.",
    );
    logger.blank();
    logger.info("Or manually add to qabot.config.json:");
    logger.dim(`  ai: ${JSON.stringify(aiConfig, null, 4)}`);
    return;
  }

  await writeConfig(projectDir, config);
  logger.blank();
  logger.success("AI configuration saved to qabot.config.json");
  logger.blank();
  logger.info("Test your setup:");
  logger.dim("  qabot auth --test");
  logger.blank();
  logger.info("Generate tests:");
  logger.dim("  qabot generate <feature>");
  logger.blank();
}
