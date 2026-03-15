import { ProcessManager } from "./process-manager.js";
import { ResultCollector, TestResult } from "./result-collector.js";
import { getRunner } from "../runners/runner-registry.js";
import { LAYERS } from "../core/constants.js";

export class TestExecutor {
  constructor(config, projectProfile) {
    this.config = config;
    this.profile = projectProfile;
    this.processManager = new ProcessManager();
    this.resultCollector = new ResultCollector();
    this.listeners = [];
  }

  onProgress(callback) {
    this.listeners.push(callback);
  }

  async execute(options = {}) {
    const {
      feature = "all",
      layers = null,
      env = "local",
      coverage = false,
      verbose = false,
      timeout = 120000,
    } = options;
    const targetLayers = layers || Object.keys(this.config.layers || {});

    this.emit({ type: "start", feature, layers: targetLayers, env });

    for (const layerName of targetLayers) {
      const layerConfig = this.config.layers?.[layerName];
      if (!layerConfig) {
        this.emit({
          type: "layer-skip",
          layer: layerName,
          reason: "not configured",
        });
        continue;
      }

      const runner = getRunner(layerConfig.runner, layerConfig);
      this.emit({
        type: "layer-start",
        layer: layerName,
        runner: runner.getDisplayName(),
      });

      const featureSrc = this.config.features?.[feature]?.src;
      const pattern = feature === "all" ? "" : featureSrc || feature;

      const command = runner.buildCommand({
        pattern,
        coverage,
        verbose,
        env: this.config.environments?.[env],
      });

      const result = await this.processManager.run(command, {
        cwd: this.profile.paths.root,
        timeout,
        onStdout: (line) =>
          this.emit({ type: "stdout", layer: layerName, line }),
        onStderr: (line) =>
          this.emit({ type: "stderr", layer: layerName, line }),
      });

      const parsed = runner.parseOutput(
        result.stdout,
        result.stderr,
        result.exitCode,
      );

      const testResult = new TestResult(runner.name, layerName, feature);
      testResult.duration = result.duration;
      testResult.summary = parsed.summary;
      testResult.tests = parsed.tests;
      testResult.coverage = parsed.coverage;
      testResult.rawOutput = verbose ? result.stdout : "";

      if (result.killed) {
        testResult.errors.push({
          message: `Timed out after ${timeout}ms`,
          type: "timeout",
        });
      }

      this.resultCollector.addResult(testResult);

      for (const test of parsed.tests) {
        this.emit({
          type:
            test.status === "passed"
              ? "test-pass"
              : test.status === "failed"
                ? "test-fail"
                : "test-skip",
          layer: layerName,
          test,
        });
      }

      this.emit({
        type: "layer-end",
        layer: layerName,
        summary: parsed.summary,
        duration: result.duration,
      });
    }

    const summary = this.resultCollector.getSummary();
    this.emit({ type: "complete", summary });

    return this.resultCollector;
  }

  emit(event) {
    for (const cb of this.listeners) {
      try {
        cb(event);
      } catch {
        /* listener error should not break execution */
      }
    }
  }
}
