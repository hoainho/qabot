import { spawn } from "node:child_process";
import treeKill from "tree-kill";

export class ProcessManager {
  async run(command, options = {}) {
    const {
      cwd = process.cwd(),
      env = {},
      timeout = 120000,
      onStdout,
      onStderr,
    } = options;

    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = "";
      let stderr = "";
      let killed = false;

      const mergedEnv = { ...process.env, ...env, FORCE_COLOR: "0" };
      const isWindows = process.platform === "win32";

      const child = spawn(command, {
        cwd,
        env: mergedEnv,
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });

      const timer =
        timeout > 0
          ? setTimeout(() => {
              killed = true;
              treeKill(child.pid, "SIGTERM");
            }, timeout)
          : null;

      child.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        if (onStdout) {
          for (const line of text.split("\n").filter(Boolean)) {
            onStdout(line);
          }
        }
      });

      child.stderr.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        if (onStderr) {
          for (const line of text.split("\n").filter(Boolean)) {
            onStderr(line);
          }
        }
      });

      child.on("close", (exitCode) => {
        if (timer) clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: exitCode ?? 1,
          duration: Date.now() - startTime,
          killed,
        });
      });

      child.on("error", (err) => {
        if (timer) clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr + "\n" + err.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          killed: false,
        });
      });
    });
  }
}
