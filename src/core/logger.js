import chalk from "chalk";

const V = chalk.hex("#A78BFA");
const V2 = chalk.hex("#7C3AED");
const V3 = chalk.hex("#C4B5FD");
const G = chalk.hex("#34D399");
const R = chalk.hex("#F87171");
const Y = chalk.hex("#FBBF24");
const DIM = chalk.hex("#6B7280");
const W = chalk.hex("#F3F4F6");

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export const logger = {
  info(msg) {
    console.log(V(`  \u25CF `) + W(msg));
  },
  success(msg) {
    console.log(G(`  \u2714 `) + W(msg));
  },
  warn(msg) {
    console.log(Y(`  \u25B2 `) + Y(msg));
  },
  error(msg) {
    console.log(R(`  \u2716 `) + R(msg));
  },

  step(current, total, msg) {
    const bar = progressBar(current, total, 12);
    console.log(V(`  ${bar} `) + W(msg));
  },

  dim(msg) {
    console.log(DIM(`     ${msg}`));
  },
  blank() {
    console.log("");
  },

  banner() {
    logger.blank();
    console.log(
      V2("   \u2588\u2588\u2588\u2588\u2588  \u2588\u2588\u2588\u2588\u2588") +
        W("  QABot"),
    );
    console.log(
      V("   \u2588\u2588  \u2588\u2588 \u2588\u2588  \u2588\u2588") +
        DIM("  AI-Powered QA Automation"),
    );
    console.log(
      V3(
        "   \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588",
      ),
    );
    logger.blank();
  },

  header(title) {
    logger.blank();
    console.log(V2("  \u2502"));
    console.log(V2("  \u251C\u2500 ") + chalk.bold.white(title));
    console.log(V2("  \u2502"));
  },

  section(title) {
    logger.blank();
    console.log(V("  \u25C6 ") + chalk.bold.white(title));
    console.log(DIM("  " + "\u2500".repeat(48)));
  },

  box(title, lines) {
    const w = 52;
    logger.blank();
    console.log(V2("  \u256D" + "\u2500".repeat(w) + "\u256E"));
    console.log(
      V2("  \u2502 ") + chalk.bold.white(title.padEnd(w - 2)) + V2(" \u2502"),
    );
    console.log(V2("  \u251C" + "\u2500".repeat(w) + "\u2524"));
    for (const line of lines) {
      const content = `  ${line}`.padEnd(w - 1);
      console.log(V2("  \u2502") + content + V2(" \u2502"));
    }
    console.log(V2("  \u2570" + "\u2500".repeat(w) + "\u256F"));
    logger.blank();
  },

  table(headers, rows) {
    const colWidths = headers.map(
      (h, i) =>
        Math.max(h.length, ...rows.map((r) => String(r[i] || "").length)) + 2,
    );
    const headerLine = headers
      .map((h, i) => V(h.padEnd(colWidths[i])))
      .join("");
    const separator = colWidths.map((w) => DIM("\u2500".repeat(w))).join("");
    logger.blank();
    console.log("  " + headerLine);
    console.log("  " + separator);
    for (const row of rows) {
      const line = row
        .map((cell, i) => {
          const str = String(cell || "");
          if (str.includes("\u2714")) return G(str.padEnd(colWidths[i]));
          if (str.includes("\u2716")) return R(str.padEnd(colWidths[i]));
          return W(str.padEnd(colWidths[i]));
        })
        .join("");
      console.log("  " + line);
    }
  },

  testResult(name, status, duration) {
    const icons = {
      passed: G("\u2714"),
      failed: R("\u2716"),
      skipped: Y("\u25CB"),
      running: V("\u25CF"),
    };
    const icon = icons[status] || DIM("\u25CB");
    const dur = duration ? DIM(` ${formatMs(duration)}`) : "";
    const nameStr =
      status === "failed" ? R(name) : status === "skipped" ? Y(name) : W(name);
    console.log(`     ${icon} ${nameStr}${dur}`);
  },

  liveTest(index, total, name, status, duration) {
    const pct = Math.round((index / total) * 100);
    const bar = progressBar(index, total, 20);
    const icons = {
      passed: G("\u2714"),
      failed: R("\u2716"),
      skipped: Y("\u25CB"),
      running: V("\u29BF"),
    };
    const icon = icons[status] || V("\u29BF");
    const dur = duration ? DIM(` ${formatMs(duration)}`) : "";
    const counter = DIM(`[${index}/${total}]`);

    process.stdout.write(
      `\r  ${V(bar)} ${counter} ${icon} ${W(name)}${dur}${"".padEnd(20)}`,
    );
    if (status !== "running") process.stdout.write("\n");
  },

  progress(label, current, total) {
    const bar = progressBar(current, total, 24);
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    process.stdout.write(
      `\r  ${V(bar)} ${V2(`${pct}%`)} ${DIM(label)}${"".padEnd(10)}`,
    );
  },

  summary(passed, failed, skipped, duration) {
    logger.blank();
    console.log(V2("  \u256D" + "\u2500".repeat(42) + "\u256E"));
    console.log(
      V2("  \u2502") + chalk.bold.white("  Results".padEnd(42)) + V2("\u2502"),
    );
    console.log(V2("  \u251C" + "\u2500".repeat(42) + "\u2524"));
    console.log(
      V2("  \u2502") +
        G(`  \u2714 ${String(passed).padStart(3)} passed`.padEnd(42)) +
        V2("\u2502"),
    );
    if (failed > 0)
      console.log(
        V2("  \u2502") +
          R(`  \u2716 ${String(failed).padStart(3)} failed`.padEnd(42)) +
          V2("\u2502"),
      );
    if (skipped > 0)
      console.log(
        V2("  \u2502") +
          Y(`  \u25CB ${String(skipped).padStart(3)} skipped`.padEnd(42)) +
          V2("\u2502"),
      );
    console.log(
      V2("  \u2502") +
        DIM(`  \u23F1 ${formatMs(duration)}`.padEnd(42)) +
        V2("\u2502"),
    );
    const total = passed + failed + skipped;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const rateColor = rate >= 80 ? G : rate >= 50 ? Y : R;
    console.log(
      V2("  \u2502") +
        rateColor(`  ${rate}% pass rate`.padEnd(42)) +
        V2("\u2502"),
    );
    console.log(V2("  \u2570" + "\u2500".repeat(42) + "\u256F"));
    logger.blank();
  },
};

function progressBar(current, total, width) {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + DIM("\u2591".repeat(empty));
}

export { formatMs };
