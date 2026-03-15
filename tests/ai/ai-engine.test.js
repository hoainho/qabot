import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIEngine } from "../../src/ai/ai-engine.js";

describe("AIEngine", () => {
  describe("constructor", () => {
    it("defaults to none provider", () => {
      const engine = new AIEngine();
      assert.equal(engine.provider, "none");
      assert.equal(engine.isAvailable(), false);
    });

    it("resolves defaults for openai", () => {
      const engine = new AIEngine({ provider: "openai" });
      assert.equal(engine.provider, "openai");
      assert.equal(engine.baseUrl, "https://api.openai.com/v1");
      assert.equal(engine.authHeader, "Authorization");
      assert.equal(engine.authPrefix, "Bearer ");
    });

    it("resolves defaults for anthropic", () => {
      const engine = new AIEngine({ provider: "anthropic" });
      assert.equal(engine.baseUrl, "https://api.anthropic.com/v1");
      assert.equal(engine.authHeader, "x-api-key");
      assert.equal(engine.authPrefix, "");
    });

    it("resolves defaults for gemini", () => {
      const engine = new AIEngine({ provider: "gemini" });
      assert.ok(engine.baseUrl.includes("googleapis.com"));
      assert.equal(engine.authHeader, "x-goog-api-key");
    });

    it("resolves defaults for deepseek", () => {
      const engine = new AIEngine({ provider: "deepseek" });
      assert.ok(engine.baseUrl.includes("deepseek.com"));
      assert.equal(engine.model, "deepseek-chat");
    });

    it("resolves defaults for groq", () => {
      const engine = new AIEngine({ provider: "groq" });
      assert.ok(engine.baseUrl.includes("groq.com"));
    });

    it("resolves defaults for ollama", () => {
      const engine = new AIEngine({ provider: "ollama" });
      assert.equal(engine.baseUrl, "http://localhost:11434");
      assert.equal(engine.model, "llama3");
    });

    it("accepts custom proxy config", () => {
      const engine = new AIEngine({
        provider: "proxy",
        baseUrl: "https://my-proxy.com/v1/chat/completions",
        apiKey: "test-key-123",
        model: "custom-model",
        authHeader: "X-Custom-Auth",
        authPrefix: "",
      });
      assert.equal(engine.provider, "proxy");
      assert.equal(engine.baseUrl, "https://my-proxy.com/v1/chat/completions");
      assert.equal(engine.apiKey, "test-key-123");
      assert.equal(engine.model, "custom-model");
      assert.equal(engine.authHeader, "X-Custom-Auth");
      assert.equal(engine.authPrefix, "");
    });

    it("user config overrides defaults", () => {
      const engine = new AIEngine({
        provider: "openai",
        baseUrl: "https://custom-openai-proxy.com/v1",
        model: "gpt-3.5-turbo",
      });
      assert.equal(engine.baseUrl, "https://custom-openai-proxy.com/v1");
      assert.equal(engine.model, "gpt-3.5-turbo");
    });

    it("preserves empty string model for proxy", () => {
      const engine = new AIEngine({
        provider: "proxy",
        model: "",
        baseUrl: "https://x.com",
      });
      assert.equal(engine.model, "");
    });
  });

  describe("isAvailable", () => {
    it("returns false for none provider", () => {
      assert.equal(new AIEngine({ provider: "none" }).isAvailable(), false);
    });

    it("returns true for ollama without api key", () => {
      assert.equal(new AIEngine({ provider: "ollama" }).isAvailable(), true);
    });

    it("returns false for openai without api key", () => {
      const saved = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      try {
        assert.equal(new AIEngine({ provider: "openai" }).isAvailable(), false);
      } finally {
        if (saved) process.env.OPENAI_API_KEY = saved;
      }
    });

    it("returns true for openai with api key", () => {
      assert.equal(
        new AIEngine({ provider: "openai", apiKey: "sk-test" }).isAvailable(),
        true,
      );
    });

    it("returns true for proxy with api key", () => {
      assert.equal(
        new AIEngine({
          provider: "proxy",
          apiKey: "key",
          baseUrl: "https://x.com",
        }).isAvailable(),
        true,
      );
    });

    it("returns true for proxy with baseUrl but no api key", () => {
      assert.equal(
        new AIEngine({
          provider: "proxy",
          baseUrl: "http://localhost:8317/v1/chat/completions",
        }).isAvailable(),
        true,
      );
    });

    it("returns false for proxy without baseUrl", () => {
      assert.equal(new AIEngine({ provider: "proxy" }).isAvailable(), false);
    });
  });

  describe("getProviderInfo", () => {
    it("returns provider metadata", () => {
      const info = new AIEngine({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-test",
      }).getProviderInfo();

      assert.equal(info.provider, "openai");
      assert.equal(info.model, "gpt-4o");
      assert.equal(info.hasApiKey, true);
      assert.ok(info.baseUrl);
    });
  });

  describe("buildAuthHeaders", () => {
    it("builds bearer auth for openai", () => {
      const engine = new AIEngine({ provider: "openai", apiKey: "sk-123" });
      const headers = engine.buildAuthHeaders();
      assert.equal(headers["Authorization"], "Bearer sk-123");
      assert.equal(headers["Content-Type"], "application/json");
    });

    it("builds x-api-key for anthropic", () => {
      const engine = new AIEngine({
        provider: "anthropic",
        apiKey: "sk-ant-123",
      });
      const headers = engine.buildAuthHeaders();
      assert.equal(headers["x-api-key"], "sk-ant-123");
    });

    it("builds custom header for proxy", () => {
      const engine = new AIEngine({
        provider: "proxy",
        apiKey: "mykey",
        authHeader: "X-My-Auth",
        authPrefix: "Token ",
      });
      const headers = engine.buildAuthHeaders();
      assert.equal(headers["X-My-Auth"], "Token mykey");
    });

    it("skips auth header when authHeader is null", () => {
      const engine = new AIEngine({ provider: "proxy", authHeader: null });
      const headers = engine.buildAuthHeaders();
      assert.equal(headers["Authorization"], undefined);
      assert.equal(headers["Content-Type"], "application/json");
    });

    it("includes extraHeaders", () => {
      const engine = new AIEngine({
        provider: "openai",
        apiKey: "sk-test",
        extraHeaders: { "X-Request-Id": "abc123" },
      });
      const headers = engine.buildAuthHeaders();
      assert.equal(headers["X-Request-Id"], "abc123");
    });
  });

  describe("complete", () => {
    it("throws for unsupported provider", async () => {
      const engine = new AIEngine({
        provider: "unknown-provider",
        apiKey: "x",
      });
      await assert.rejects(() => engine.complete("test"), /not supported/);
    });

    it("throws for proxy without baseUrl", async () => {
      const engine = new AIEngine({
        provider: "proxy",
        apiKey: "x",
        baseUrl: "",
      });
      await assert.rejects(() => engine.complete("test"), /requires baseUrl/);
    });
  });

  describe("resolveApiKey", () => {
    it("prefers explicit apiKey over env", () => {
      const engine = new AIEngine({ provider: "openai", apiKey: "direct-key" });
      assert.equal(engine.apiKey, "direct-key");
    });

    it("falls back to env var by provider name", () => {
      const original = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "env-key-test";
      try {
        const engine = new AIEngine({ provider: "openai" });
        assert.equal(engine.apiKey, "env-key-test");
      } finally {
        if (original) process.env.OPENAI_API_KEY = original;
        else delete process.env.OPENAI_API_KEY;
      }
    });

    it("uses custom apiKeyEnv", () => {
      const original = process.env.MY_CUSTOM_KEY;
      process.env.MY_CUSTOM_KEY = "custom-env-value";
      try {
        const engine = new AIEngine({
          provider: "proxy",
          apiKeyEnv: "MY_CUSTOM_KEY",
        });
        assert.equal(engine.apiKey, "custom-env-value");
      } finally {
        if (original) process.env.MY_CUSTOM_KEY = original;
        else delete process.env.MY_CUSTOM_KEY;
      }
    });
  });
});
