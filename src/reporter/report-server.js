import { exec } from "node:child_process";
import { platform } from "node:os";

export async function openInBrowser(filePath) {
  const commands = {
    darwin: `open "${filePath}"`,
    win32: `start "" "${filePath}"`,
    linux: `xdg-open "${filePath}"`,
  };
  const cmd = commands[platform()] || commands.linux;

  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
