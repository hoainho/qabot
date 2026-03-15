import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { AIEngine } from "../../src/ai/ai-engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_SERVER = path.join(__dirname, "..", "mock-proxy-server.js");

let serverProcess;
let serverPort;

async function startMockServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn("node", [MOCK_SERVER, "0"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    serverProcess.stdout.once("data", (data) => {
      serverPort = parseInt(data.toString().trim());
      resolve(serverPort);
    });
    serverProcess.on("error", reject);
    setTimeout(() => reject(new Error("Mock server timeout")), 5000);
  });
}

describe("AIEngine integration with mock proxy", () => {
  before(async () => {
    await startMockServer();
  });

  after(() => {
    if (serverProcess) serverProcess.kill();
  });

  it("proxy completes request to OpenAI-compatible endpoint", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/v1/chat/completions`,
      model: "test-model",
    });

    assert.ok(engine.isAvailable());
    const response = await engine.complete("Hello");
    assert.ok(response.includes("QABOT_OK"));
    assert.ok(response.includes("test-model"));
  });

  it("proxy works without model field", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/v1/chat/completions`,
      model: "",
    });

    const response = await engine.complete("Hello");
    assert.ok(response.includes("QABOT_OK"));
    assert.ok(response.includes("model: none"));
  });

  it("proxy works without API key when server allows", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/v1/chat/completions`,
    });

    assert.ok(engine.isAvailable());
    const response = await engine.complete("Test");
    assert.ok(response.includes("QABOT_OK"));
  });

  it("proxy sends auth header when configured", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/needs-auth`,
      apiKey: "my-secret-key",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
    });

    const response = await engine.complete("Test");
    assert.ok(response.includes("QABOT_OK"));
    assert.ok(response.includes("Bearer my-secret-key"));
  });

  it("proxy handles custom response format (text field)", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/custom-endpoint`,
    });

    const response = await engine.complete("Test");
    assert.ok(response.includes("QABOT_OK from custom endpoint"));
  });

  it("proxy throws on 401 when auth required but missing", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/needs-auth`,
    });

    await assert.rejects(() => engine.complete("Test"), /401/);
  });

  it("proxy throws on 404 for bad endpoint", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/nonexistent`,
    });

    await assert.rejects(() => engine.complete("Test"), /404/);
  });

  it("openai-compatible provider works with mock", async () => {
    const engine = new AIEngine({
      provider: "openai",
      baseUrl: `http://localhost:${serverPort}/v1`,
      apiKey: "sk-test",
      model: "gpt-4o",
    });

    const response = await engine.complete("Hello");
    assert.ok(response.includes("QABOT_OK"));
  });

  it("analyzeCode returns parsed JSON array", async () => {
    const engine = new AIEngine({
      provider: "proxy",
      baseUrl: `http://localhost:${serverPort}/v1/chat/completions`,
    });

    const result = await engine.analyzeCode(
      "function add(a, b) { return a + b; }",
      {
        framework: "react",
        runner: "jest",
        existingTestCount: 0,
      },
    );

    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
  });
});
