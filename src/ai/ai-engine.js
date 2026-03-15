import {
  buildAnalysisPrompt,
  buildGenerationPrompt,
  buildRecommendationPrompt,
  buildFixPrompt,
} from "./prompt-builder.js";
import { AI_PROVIDER_DEFAULTS } from "../core/constants.js";

export class AIEngine {
  constructor(config = {}) {
    this.provider = config.provider || "none";
    this.model =
      config.model ?? AI_PROVIDER_DEFAULTS[this.provider]?.model ?? "";
    this.apiKey = resolveApiKey(config);
    this.baseUrl =
      config.baseUrl || AI_PROVIDER_DEFAULTS[this.provider]?.baseUrl || "";
    this.authHeader =
      config.authHeader ||
      AI_PROVIDER_DEFAULTS[this.provider]?.authHeader ||
      "Authorization";
    this.authPrefix =
      config.authPrefix ??
      AI_PROVIDER_DEFAULTS[this.provider]?.authPrefix ??
      "Bearer ";
    this.extraHeaders = config.extraHeaders || {};
    this.temperature = config.temperature ?? 0.3;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  isAvailable() {
    if (this.provider === "none") return false;
    if (this.provider === "ollama") return true;
    if (this.provider === "proxy") return !!this.baseUrl;
    return !!this.apiKey;
  }

  getProviderInfo() {
    const preview = this.apiKey
      ? this.apiKey.slice(0, 4) + "****" + this.apiKey.slice(-4)
      : "";
    return {
      provider: this.provider,
      model: this.model,
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      apiKeyPreview: preview,
    };
  }

  async analyzeCode(code, context) {
    const prompt = buildAnalysisPrompt(code, context);
    const response = await this.complete(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return [
        {
          name: "Parse error",
          description: response,
          type: "unit",
          priority: "P1",
        },
      ];
    }
  }

  async generateTestCode(testCases, context) {
    const maxBatchSize = 8;

    if (testCases.length <= maxBatchSize) {
      const prompt = buildGenerationPrompt(testCases, context);
      const savedMaxTokens = this.maxTokens;
      this.maxTokens = Math.max(this.maxTokens, 8192);
      try {
        return await this.complete(prompt);
      } finally {
        this.maxTokens = savedMaxTokens;
      }
    }

    const batches = [];
    for (let i = 0; i < testCases.length; i += maxBatchSize) {
      batches.push(testCases.slice(i, i + maxBatchSize));
    }

    const savedMaxTokens = this.maxTokens;
    this.maxTokens = Math.max(this.maxTokens, 8192);

    let fullCode = "";
    try {
      for (let i = 0; i < batches.length; i++) {
        const isFirst = i === 0;
        const batchContext = { ...context };
        if (!isFirst) {
          batchContext.existingTestCode = "";
          batchContext.sourceCode = "";
          batchContext.isContinuation = true;
        }
        const prompt = buildGenerationPrompt(batches[i], batchContext);
        let code = await this.complete(prompt);
        if (!isFirst) {
          code = stripDuplicateImports(code);
        }
        fullCode += (isFirst ? "" : "\n\n") + code;
      }
    } finally {
      this.maxTokens = savedMaxTokens;
    }

    return fullCode;
  }

  async fixTestCode(code, errorMessage, context) {
    const prompt = buildFixPrompt(code, errorMessage, context);
    const savedMaxTokens = this.maxTokens;
    this.maxTokens = Math.max(this.maxTokens, 8192);
    try {
      return await this.complete(prompt);
    } finally {
      this.maxTokens = savedMaxTokens;
    }
  }

  async generateRecommendations(results) {
    const prompt = buildRecommendationPrompt(results);
    return this.complete(prompt);
  }

  async complete(prompt) {
    switch (this.provider) {
      case "openai":
      case "deepseek":
      case "groq":
        return this.callOpenAICompatible(prompt);
      case "anthropic":
        return this.callAnthropic(prompt);
      case "gemini":
        return this.callGemini(prompt);
      case "ollama":
        return this.callOllama(prompt);
      case "proxy":
        return this.callProxy(prompt);
      default:
        throw new Error(
          `AI provider "${this.provider}" not supported. Available: openai, anthropic, gemini, deepseek, groq, ollama, proxy`,
        );
    }
  }

  buildAuthHeaders() {
    const headers = {
      "Content-Type": "application/json",
      ...this.extraHeaders,
    };
    if (this.authHeader && this.apiKey) {
      headers[this.authHeader] = `${this.authPrefix}${this.apiKey}`;
    }
    return headers;
  }

  async callOpenAICompatible(prompt) {
    const url = `${this.baseUrl}/chat/completions`;
    const headers = this.buildAuthHeaders();

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${this.provider} API error (${res.status}): ${body}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async callAnthropic(prompt) {
    const url = `${this.baseUrl}/messages`;
    const headers = {
      ...this.buildAuthHeaders(),
      "anthropic-version": "2023-06-01",
    };

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API error (${res.status}): ${body}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || "";
  }

  async callGemini(prompt) {
    const url = `${this.baseUrl}/models/${this.model}:generateContent`;
    const headers = this.buildAuthHeaders();

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini API error (${res.status}): ${body}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  async callOllama(prompt) {
    const url = `${this.baseUrl}/api/generate`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama API error (${res.status})`);
    const data = await res.json();
    return data.response || "";
  }

  async callProxy(prompt) {
    if (!this.baseUrl) {
      throw new Error(
        "Proxy provider requires baseUrl. Set ai.baseUrl in qabot.config.json",
      );
    }

    const headers = this.buildAuthHeaders();

    const reqBody = {
      messages: [{ role: "user", content: prompt }],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false,
    };
    if (this.model) reqBody.model = this.model;

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Proxy API error (${res.status}): ${errText}`);
    }

    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      const jsonLine = rawText
        .split("\n")
        .find((l) => l.startsWith("data: ") && !l.includes("[DONE]"));
      if (jsonLine) {
        data = JSON.parse(jsonLine.slice(6));
        if (data.choices?.[0]?.delta?.content) {
          return data.choices[0].delta.content;
        }
      }
      throw new Error(
        `Proxy returned non-JSON response. First 200 chars: ${rawText.slice(0, 200)}`,
      );
    }

    if (data.choices?.[0]?.message?.content)
      return data.choices[0].message.content;
    if (data.content?.[0]?.text) return data.content[0].text;
    if (data.candidates?.[0]?.content?.parts?.[0]?.text)
      return data.candidates[0].content.parts[0].text;
    if (data.response) return data.response;
    if (typeof data.text === "string") return data.text;
    if (typeof data.output === "string") return data.output;
    if (typeof data.result === "string") return data.result;

    throw new Error(
      "Proxy returned unknown response format. Expected OpenAI/Anthropic/Gemini compatible response.",
    );
  }
}

function stripDuplicateImports(code) {
  const lines = code.split("\n");
  let inMockBlock = false;
  let braceDepth = 0;
  const filtered = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("import ")) continue;
    if (trimmed.startsWith("jest.mock(")) {
      inMockBlock = true;
      braceDepth = 0;
    }

    if (inMockBlock) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0 && trimmed.endsWith(");")) {
        inMockBlock = false;
      }
      continue;
    }

    filtered.push(line);
  }

  return filtered.join("\n").trim();
}

function resolveApiKey(config) {
  if (config.apiKey) return config.apiKey;
  if (config.apiKeyEnv) return process.env[config.apiKeyEnv] || "";

  const envMap = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    groq: "GROQ_API_KEY",
    proxy: "PROXY_API_KEY",
  };

  const envName = envMap[config.provider];
  return envName ? process.env[envName] || "" : "";
}
