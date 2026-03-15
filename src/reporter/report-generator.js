import path from "node:path";
import { writeFile, readdir, readFile } from "node:fs/promises";
import { ensureDir, writeJSON } from "../utils/file-utils.js";
import { HtmlBuilder } from "./html-builder.js";
import { openInBrowser } from "./report-server.js";

export class ReportGenerator {
  constructor(config) {
    this.config = config;
    this.outputDir = config.reporting?.outputDir || "./qabot-reports";
  }

  async generate(results, meta) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const reportDir = path.join(
      this.outputDir,
      `${dateStr}_${meta.feature || "all"}`,
    );
    await ensureDir(reportDir);

    const jsonPath = path.join(reportDir, "results.json");
    await writeJSON(jsonPath, results);

    const htmlBuilder = new HtmlBuilder();
    const html = htmlBuilder.render(results, meta);
    const htmlPath = path.join(reportDir, "index.html");
    await writeFile(htmlPath, html, "utf-8");

    if (this.config.reporting?.openAfterRun) {
      try {
        await openInBrowser(path.resolve(htmlPath));
      } catch {
        /* noop */
      }
    }

    return {
      reportDir,
      htmlPath: path.resolve(htmlPath),
      jsonPath: path.resolve(jsonPath),
    };
  }

  async openLatest() {
    const reports = await this.listReports();
    if (reports.length === 0) throw new Error("No reports found");
    await openInBrowser(reports[0].htmlPath);
  }

  async listReports() {
    try {
      const entries = await readdir(this.outputDir, { withFileTypes: true });
      const dirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .reverse();

      const reports = [];
      for (const dir of dirs) {
        const jsonPath = path.join(this.outputDir, dir, "results.json");
        const htmlPath = path.resolve(
          path.join(this.outputDir, dir, "index.html"),
        );
        try {
          const data = JSON.parse(await readFile(jsonPath, "utf-8"));
          const parts = dir.split("_");
          reports.push({
            date: parts[0] || dir,
            feature: parts.slice(1).join("_") || "all",
            passRate: data.summary?.overallPassRate || 0,
            path: htmlPath,
            htmlPath,
          });
        } catch {
          /* skip broken reports */
        }
      }
      return reports;
    } catch {
      return [];
    }
  }
}
