import { buildE2EPrompt } from "./e2e-prompts.js";

export async function generateE2ESpec(ai, featureName, context) {
  const prompt = buildE2EPrompt(featureName, context);

  const savedMaxTokens = ai.maxTokens;
  ai.maxTokens = Math.max(ai.maxTokens, 8192);
  try {
    const code = await ai.complete(prompt);
    return cleanSpec(code);
  } finally {
    ai.maxTokens = savedMaxTokens;
  }
}

export async function fixE2ESpec(ai, code, errorMessage, context) {
  const prompt = `You are fixing a broken Playwright E2E test.

## Error
\`\`\`
${errorMessage.slice(0, 2000)}
\`\`\`

## Current test code
\`\`\`javascript
${code}
\`\`\`

## Context
- Base URL: ${context.baseUrl || "http://localhost:3000"}
- Auth: ${context.authProvider || "none"}

## Common Playwright fixes
1. Wrong selector — use getByRole, getByText, getByTestId instead of CSS selectors
2. Timing — add waitForLoadState("networkidle") or waitForSelector
3. Element not visible — scroll into view or wait for animation
4. Navigation — ensure page.goto uses correct path
5. Auth — ensure login completed before testing

Return the COMPLETE fixed test file. No markdown fences.`;

  const savedMaxTokens = ai.maxTokens;
  ai.maxTokens = Math.max(ai.maxTokens, 8192);
  try {
    const fixed = await ai.complete(prompt);
    return cleanSpec(fixed);
  } finally {
    ai.maxTokens = savedMaxTokens;
  }
}

function cleanSpec(code) {
  let cleaned = code.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(cleaned.indexOf("\n") + 1);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, cleaned.lastIndexOf("```"));
  }
  return cleaned.trim() + "\n";
}
