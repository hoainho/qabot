import { readFile } from "node:fs/promises";
import path from "node:path";

export class UseCaseParser {
  async parse(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const content = await readFile(filePath, "utf-8");

    switch (ext) {
      case ".md":
        return this.parseMarkdown(content);
      case ".feature":
        return this.parseGherkin(content);
      default:
        return this.parsePlainText(content);
    }
  }

  parseMarkdown(content) {
    const scenarios = [];
    const sections = content.split(/^##\s+/m).filter(Boolean);

    for (const section of sections) {
      const lines = section.split("\n");
      const title = lines[0]?.trim();
      if (!title) continue;

      const titleIsStep =
        /^\s*\d+\.\s+/.test(title) || /^\s*[-*]\s+/.test(title);
      if (titleIsStep) continue;

      const steps = lines
        .slice(1)
        .filter((l) => /^\s*\d+\.\s+/.test(l) || /^\s*[-*]\s+/.test(l))
        .map((l) =>
          l
            .replace(/^\s*\d+\.\s+/, "")
            .replace(/^\s*[-*]\s+/, "")
            .trim(),
        )
        .filter(Boolean);

      if (steps.length > 0) {
        scenarios.push({ scenario: title, steps, source: "markdown" });
      }
    }

    if (scenarios.length === 0) {
      const allSteps = content
        .split("\n")
        .filter((l) => /^\s*\d+\.\s+/.test(l) || /^\s*[-*]\s+/.test(l))
        .map((l) =>
          l
            .replace(/^\s*\d+\.\s+/, "")
            .replace(/^\s*[-*]\s+/, "")
            .trim(),
        )
        .filter(Boolean);

      if (allSteps.length > 0) {
        scenarios.push({
          scenario: "Default Flow",
          steps: allSteps,
          source: "markdown",
        });
      }
    }

    return scenarios;
  }

  parseGherkin(content) {
    const scenarios = [];
    const scenarioBlocks = content
      .split(/^(?:Scenario|Scenario Outline):\s*/m)
      .slice(1);

    for (const block of scenarioBlocks) {
      const lines = block.split("\n");
      const title = lines[0]?.trim();
      const steps = lines
        .slice(1)
        .filter((l) => /^\s*(Given|When|Then|And|But)\s+/i.test(l))
        .map((l) => l.trim())
        .filter(Boolean);

      if (title && steps.length > 0) {
        scenarios.push({ scenario: title, steps, source: "gherkin" });
      }
    }

    return scenarios;
  }

  parsePlainText(content) {
    const scenarios = [];
    const blocks = content.split(/\n\s*\n/).filter(Boolean);

    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) continue;

      const hasNumbers = lines.some((l) => /^\d+[.)]\s+/.test(l));
      if (hasNumbers) {
        const steps = lines
          .filter((l) => /^\d+[.)]\s+/.test(l))
          .map((l) => l.replace(/^\d+[.)]\s+/, "").trim());
        const title = lines.find((l) => !/^\d+[.)]\s+/.test(l)) || "Flow";
        scenarios.push({ scenario: title, steps, source: "text" });
      } else if (lines.length >= 2) {
        scenarios.push({
          scenario: lines[0],
          steps: lines.slice(1),
          source: "text",
        });
      }
    }

    return scenarios;
  }
}
