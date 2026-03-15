import { logger } from "../../core/logger.js";
import { loadConfig } from "../../core/config.js";
import { ReportGenerator } from "../../reporter/report-generator.js";

export function registerReportCommand(program) {
  program
    .command("report")
    .description("Open the latest test report or list all reports")
    .option("--list", "List all available reports")
    .option("--open <path>", "Open a specific report")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(runReport);
}

async function runReport(options) {
  const { config } = await loadConfig(options.dir);
  const reporter = new ReportGenerator(config);

  if (options.list) {
    const reports = await reporter.listReports();
    if (reports.length === 0) {
      logger.info("No reports found. Run `qabot run` first.");
      return;
    }
    logger.header("QABot - Reports");
    logger.table(
      ["Date", "Feature", "Pass Rate", "Path"],
      reports.map((r) => [r.date, r.feature, `${r.passRate}%`, r.path]),
    );
    logger.blank();
    return;
  }

  if (options.open) {
    const { openInBrowser } = await import("../../reporter/report-server.js");
    await openInBrowser(options.open);
    return;
  }

  try {
    await reporter.openLatest();
  } catch (err) {
    logger.error(`Could not open report: ${err.message}`);
    logger.dim("Run `qabot run` first to generate a report.");
  }
}
