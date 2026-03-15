export function buildAnalysisPrompt(code, context) {
  const useCaseSection = context.useCases?.length
    ? `\n## Use Cases from QA Team\n${context.useCases.map((uc) => `- Scenario: ${uc.scenario}\n  Steps: ${uc.steps.join(" -> ")}`).join("\n")}\n`
    : "";

  return `You are a senior QA engineer analyzing source code to identify test cases.

## Project Context
- Framework: ${context.framework || "unknown"}
- Test Runner: ${context.runner || "jest"}
- Existing Test Count: ${context.existingTestCount || 0}
${useCaseSection}
## Source Code
\`\`\`
${truncate(code, 8000)}
\`\`\`

## Task
Analyze the code and return a JSON array of test cases. Each test case:
{
  "name": "descriptive test name using should/when pattern",
  "type": "unit | integration | e2e",
  "priority": "P0 | P1 | P2",
  "description": "what this test verifies and why",
  "assertions": ["list of specific things to assert"]
}

Focus on:
1. Happy path scenarios (P0)
2. Error handling and edge cases (P1)
3. User interaction flows (P1)
4. Boundary conditions (P2)

Return ONLY valid JSON array, no markdown fences, no explanation.`;
}

export function buildGenerationPrompt(testCases, context) {
  const sourceSection = context.sourceCode
    ? `\n## Source Code Being Tested\n\`\`\`\n${truncate(context.sourceCode, 6000)}\n\`\`\`\n`
    : "";

  const existingTestSection = context.existingTestCode
    ? `\n## Existing Test Examples (match this style exactly)\n\`\`\`\n${truncate(context.existingTestCode, 3000)}\n\`\`\`\n`
    : "";

  const importPath = context.importPath || "../index";
  const isContinuation = context.isContinuation || false;

  const continuationRule = isContinuation
    ? `\nIMPORTANT: This is a CONTINUATION batch. Do NOT include any import statements, require() calls, or jest.mock() calls. Write ONLY describe() and it() blocks. The imports and mocks are already defined in a previous batch.\n`
    : "";

  return `You are a senior test engineer writing production-quality test code.

## Context
- Framework: ${context.framework || "react"}
- Test Runner: ${context.runner || "jest"}
- Language: JavaScript/JSX
- Import path for module under test: "${importPath}"
${sourceSection}${existingTestSection}${continuationRule}
## Test Cases to Implement
${JSON.stringify(testCases, null, 2)}

## Rules
1. ${isContinuation ? "Write ONLY describe/it blocks — NO imports, NO jest.mock" : "Write a COMPLETE, RUNNABLE test file with all imports"}
2. Use @testing-library/react for rendering components
3. Use @testing-library/user-event for user interactions
${isContinuation ? "" : "4. Use jest.mock() for module mocking\n"}5. Use screen queries: getByRole, getByText, getByTestId
6. Use waitFor and findBy* for async assertions
7. Each test must be independent — no shared mutable state
8. Use descriptive it() names matching the test case names above
9. Group related tests in describe() blocks
10. Mock external dependencies (API calls, Redux store, Router)
11. Do NOT import from node_modules paths — use package names

Return ONLY the JavaScript code. No markdown fences. No explanation before or after the code.`;
}

export function buildRecommendationPrompt(results) {
  const summary = results.summary || {};
  const failedTests = (results.results || [])
    .flatMap((r) => r.tests || [])
    .filter((t) => t.status === "failed")
    .slice(0, 5);

  return `You are a QA lead reviewing test results.

## Summary
- Total: ${summary.totalTests}, Passed: ${summary.totalPassed}, Failed: ${summary.totalFailed}
- Pass Rate: ${summary.overallPassRate}%

## Failed Tests
${failedTests.map((t) => `- ${t.name}: ${t.error?.message || "unknown error"}`).join("\n")}

Provide 3-5 actionable recommendations to improve test quality. Return as JSON array:
[{"priority": "high|medium|low", "recommendation": "...", "rationale": "..."}]

Return ONLY valid JSON array.`;
}

export function buildFixPrompt(code, errorMessage, context) {
  return `You are a senior test engineer fixing a broken test file.

## Error from test runner
\`\`\`
${truncate(errorMessage, 2000)}
\`\`\`

## Current test file (has errors)
\`\`\`javascript
${truncate(code, 10000)}
\`\`\`

## Project Context
- Framework: ${context.framework || "react"}
- Test Runner: ${context.runner || "jest"}
- Module aliases: ~/ maps to src/
- Tests are in: src/<feature>/tests/<Name>.test.js

## Common fixes needed
1. Duplicate imports — remove duplicate import/require lines
2. Wrong import paths — use ~/ alias for src/ imports
3. Missing mock — add jest.mock() for unmocked dependencies
4. Syntax errors — fix unclosed brackets, parens, template literals
5. Wrong API usage — check if mocked functions match actual API

## Rules
- Return the COMPLETE fixed test file
- Do NOT remove any test cases — fix them
- Do NOT add markdown fences
- Return ONLY the JavaScript code

Fix ALL errors and return the complete corrected file.`;
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "\n... (truncated)";
}
