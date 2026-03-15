export function buildE2EPrompt(featureName, context) {
  const sourceSection = context.sourceCode
    ? `\n## Source Code Analysis\nUse this to understand the page structure, components, routes, buttons, forms, modals, and data flow:\n\`\`\`\n${context.sourceCode.slice(0, 8000)}\n\`\`\`\n`
    : "";

  const routeSection = context.route
    ? `\n## Page Route: ${context.route}\n`
    : "";

  const useCaseSection = context.useCases?.length
    ? `\n## QA Use Cases (from QA team)\n${context.useCases.map((uc) => `### ${uc.scenario}\n${uc.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`).join("\n\n")}\n`
    : "";

  return `You are an expert QA automation engineer. Write comprehensive Playwright E2E tests.

## Feature: ${featureName}
## Base URL: ${context.baseUrl || "http://localhost:3000"}
## Auth: ${context.authProvider || "none"} (use auth helper if needed)
${routeSection}${sourceSection}${useCaseSection}

## REQUIREMENTS — Generate AT LEAST 8 test cases covering:

### Must Include (P0 — Critical):
1. Page Load & Layout — verify page loads, key sections visible, no console errors
2. Navigation — verify URL is correct, breadcrumbs/tabs work
3. Primary User Action — the main thing a user does on this page (click button, submit form, etc)
4. Data Display — verify data renders correctly (lists, cards, tables, amounts)

### Should Include (P1 — Important):
5. Secondary Actions — other clickable elements, links, toggles
6. Error States — what happens when something goes wrong (empty data, network error)
7. Loading States — skeleton/spinner shows while data loads
8. Responsive/Mobile — if applicable, test viewport changes

### Nice to Have (P2 — Edge Cases):
9. Edge Cases — empty states, boundary values, special characters
10. Authentication Guards — verify redirects when not logged in

## PLAYWRIGHT RULES:
1. Use \`const { test, expect } = require("@playwright/test");\`
2. ALWAYS start with \`test.describe("${featureName}", () => { ... })\`
3. Use \`test.beforeEach\` for common setup (login + navigate)
4. Use accessible selectors IN THIS ORDER of preference:
   - \`page.getByRole("button", { name: /text/i })\`
   - \`page.getByText(/text/i)\`
   - \`page.getByTestId("id")\`
   - \`page.locator("css-selector")\` (LAST resort)
5. After every navigation: \`await page.waitForLoadState("networkidle")\`
6. Take screenshot at EVERY test: \`await page.screenshot({ path: "e2e/screenshots/${featureName}-{testname}.png", fullPage: true })\`
7. Use \`expect(locator).toBeVisible()\` not \`toBeTruthy()\`
8. Use \`{ timeout: 15000 }\` for slow-loading elements
9. Handle auth:
   \`\`\`
   const { login } = require("../helpers/auth.js");
   test.beforeEach(async ({ page, baseURL }) => {
     await login(page, baseURL);
     await page.goto("${context.route || "/" + featureName}");
     await page.waitForLoadState("networkidle");
   });
   \`\`\`
10. Each test MUST have a clear assertion with \`expect()\`
11. Add \`test.slow()\` for tests that need extra time

## OUTPUT FORMAT:
Return ONLY JavaScript code. No markdown fences. No explanation.
Generate a COMPLETE runnable spec file with 8-12 tests.`;
}
