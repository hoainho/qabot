<p align="center">
  <img src="https://img.shields.io/badge/QABot-AI%20Powered%20QA-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik05LjQgMTYuNkw0LjggMTJsNC42LTQuNkw4IDZsLTYgNiA2IDYgMS40LTEuNHptNS4yIDBsNC42LTQuNi00LjYtNC42TDE2IDZsNiA2LTYgNi0xLjQtMS40eiIvPjwvc3ZnPg==&logoColor=white" alt="QABot" />
</p>

<h1 align="center">QABot</h1>

<p align="center">
  <strong>AI-Powered Universal QA Automation Tool</strong>
</p>

<p align="center">
  Import any project. AI analyzes structure. Run tests across all layers. Zero config.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@nhonh/qabot"><img src="https://img.shields.io/npm/v/@nhonh/qabot?color=cb3837&logo=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@nhonh/qabot"><img src="https://img.shields.io/npm/dw/@nhonh/qabot?color=cb3837&logo=npm&label=downloads%2Fweek" alt="npm downloads/week" /></a>
  <a href="https://www.npmjs.com/package/@nhonh/qabot"><img src="https://img.shields.io/npm/dt/@nhonh/qabot?color=cb3837&logo=npm&label=total%20downloads" alt="total downloads" /></a>
  <a href="https://github.com/hoainho/qabot/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@nhonh/qabot?color=blue" alt="license" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@nhonh/qabot?color=339933&logo=node.js&logoColor=white" alt="node version" /></a>
  <a href="https://github.com/hoainho/qabot"><img src="https://img.shields.io/github/stars/hoainho/qabot?style=social" alt="GitHub stars" /></a>
</p>

---

## Why QABot?

Testing is the most critical part of software development, but setting up and maintaining test infrastructure across frameworks, layers, and environments is painfully repetitive. **QABot eliminates that friction.**

Point QABot at **any** project — React, Next.js, Vue, Angular, .NET, Python, or Node.js — and it will **auto-detect** your framework, test runners, features, and environments. Then it runs tests across **unit, integration, and E2E layers** from a single CLI. Need test cases? QABot's AI engine analyzes your code and **generates production-ready tests** using OpenAI, Claude, Gemini, or 4 other providers.

---

## Features

- **AI-Powered Test Analysis** — AI analyzes your source code and generates comprehensive test cases. Supports OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, Ollama (local), and custom proxy endpoints.

- **Smart Project Detection** — Auto-detects project type (React, Next.js, Vue, Angular, .NET, Python, Node.js), framework, bundler, state management, and auth provider. Zero configuration needed.

- **Universal Test Runner** — Runs Jest, Vitest, Playwright, Cypress, pytest, xUnit, and dotnet-test from a single CLI. No more switching between different test commands.

- **Beautiful HTML Reports** — Generates interactive HTML + JSON reports with pass/fail/skip statistics, duration tracking, and historical run comparison.

- **E2E Test Generation** — AI generates Playwright E2E tests from feature descriptions with automatic error detection and self-healing fix capabilities.

- **Multi-Layer Testing** — Run unit, integration, and E2E tests separately or together. Filter by layer with `--layer unit` or run everything at once.

- **Environment Management** — Detect and switch between local, staging, and production environments. Each environment gets its own config and credentials.

- **Use Case Driven** — Import use cases from Markdown, Gherkin Feature files, or plain text docs. Map them directly to test coverage.

- **Extensible Runner System** — Plugin-based architecture makes it easy to add support for new test frameworks. Each runner extends a common `BaseRunner` interface.

- **Multi-AI Provider** — Switch AI providers instantly. Configure during `qabot init` or change anytime in `qabot.config.json`. Supports 7 providers including local Ollama.

---

## Quick Start

### Install

```bash
# Install globally
npm install -g @nhonh/qabot

# Or use npx (no install needed)
npx @nhonh/qabot --help
```

### Initialize

```bash
cd your-project
qabot init
```

QABot scans your project and generates a `qabot.config.json`:

```
  ╔═══════════════════════════════════╗
  ║  QABot - Project Analysis         ║
  ╠═══════════════════════════════════╣
  ║  Project:    my-react-app         ║
  ║  Type:       react-spa            ║
  ║  Framework:  React 18             ║
  ║  Runners:    Jest, Playwright     ║
  ║  Features:   12 detected          ║
  ║  Unit Tests: 45 files             ║
  ║  E2E Tests:  8 files              ║
  ╚═══════════════════════════════════╝
```

### Run Tests

```bash
# Run all tests
qabot run

# Run tests for a specific feature
qabot run auth

# Run only unit tests
qabot run --layer unit

# Run E2E tests against staging
qabot run --layer e2e --env staging

# Run with coverage
qabot run --coverage

# Verbose output
qabot run --verbose
```

### Generate Tests with AI

```bash
# Generate test cases for a feature
qabot generate login

# Generate E2E tests
qabot generate checkout --layer e2e
```

---

## CLI Commands

| Command | Description |
|---|---|
| `qabot init` | Analyze project and generate configuration |
| `qabot init -y` | Initialize with all defaults (no prompts) |
| `qabot run [feature]` | Run tests for all or a specific feature |
| `qabot run --layer <layers>` | Run specific test layers (unit, integration, e2e) |
| `qabot test` | Run tests with advanced options |
| `qabot list` | Show detected features, test frameworks, and coverage |
| `qabot generate <feature>` | AI-generate test cases for a feature |
| `qabot report` | Open the latest HTML test report |
| `qabot auth` | Configure authentication for E2E tests |

---

## Supported Frameworks

| Category | Supported |
|---|---|
| **Frontend** | React, Next.js, Vue, Angular |
| **Backend** | Node.js, .NET, Python |
| **Test Runners** | Jest, Vitest, Playwright, Cypress, pytest, xUnit, dotnet-test |
| **AI Providers** | OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, Ollama, Custom Proxy |
| **Languages** | JavaScript, TypeScript, Python, C# |
| **Package Managers** | npm, yarn, pnpm, pip, dotnet |

---

## Multi-Layer Testing

QABot organizes tests into three distinct layers, each serving a specific purpose:

### Unit Tests
Validate individual functions, components, and modules in isolation. Fast feedback loop, run in milliseconds.

```bash
qabot run --layer unit
```

### Integration Tests
Test how modules interact with each other, including API calls, database queries, and service communication.

```bash
qabot run --layer integration
```

### E2E Tests
Full user journey simulation in a real browser. Tests the complete application stack from the user's perspective.

```bash
qabot run --layer e2e --env staging
```

### Test Priority System

QABot assigns priorities to help you focus on what matters most:

| Priority | Meaning | Example |
|---|---|---|
| **P0** | Critical — Must pass before deploy | Login, Payment, Core API |
| **P1** | High — Important user journeys | Registration, Search, Profile |
| **P2** | Medium — Standard features | Settings, Notifications |
| **P3** | Low — Edge cases and cosmetic | Tooltips, Animations |

---

## AI Test Generation

QABot's AI engine doesn't just suggest test names — it generates **complete, runnable test code**.

### How It Works

1. **Analyze** — AI reads your source code and understands component behavior, API contracts, and edge cases
2. **Generate** — Produces full test files compatible with your test runner (Jest, Vitest, Playwright, etc.)
3. **Auto-Fix** — If generated tests fail on first run, AI reads the error output and automatically fixes the code
4. **Batch Support** — Handles large codebases by batching test generation (up to 8 test cases per batch)

### Supported AI Providers

| Provider | Model | Setup |
|---|---|---|
| **OpenAI** | GPT-4o | `OPENAI_API_KEY` |
| **Anthropic** | Claude Sonnet 4 | `ANTHROPIC_API_KEY` |
| **Google** | Gemini 2.5 Flash | `GEMINI_API_KEY` |
| **DeepSeek** | DeepSeek Chat | `DEEPSEEK_API_KEY` |
| **Groq** | Llama 3.3 70B | `GROQ_API_KEY` |
| **Ollama** | Llama 3 (local) | No key needed |
| **Custom Proxy** | Any model | `PROXY_API_KEY` + `baseUrl` |

Configure during initialization:

```bash
qabot init
# Select your AI provider when prompted
```

Or set in `qabot.config.json`:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKeyEnv": "ANTHROPIC_API_KEY"
  }
}
```

---

## Configuration

QABot uses a `qabot.config.json` file in your project root. Generated automatically by `qabot init`.

```json
{
  "project": {
    "name": "my-app",
    "type": "react-spa"
  },
  "environments": {
    "local": { "url": "http://localhost:3000" },
    "staging": { "url": "https://staging.myapp.com" }
  },
  "layers": {
    "unit": {
      "runner": "jest",
      "command": "npx jest {pattern}",
      "testMatch": "**/*.test.*"
    },
    "e2e": {
      "runner": "playwright",
      "command": "npx playwright test {pattern}",
      "testDir": "e2e/tests"
    }
  },
  "features": {
    "auth": { "src": "src/features/auth", "priority": "P0" },
    "dashboard": { "src": "src/pages/Dashboard", "priority": "P1" },
    "settings": { "src": "src/pages/Settings", "priority": "P2" }
  },
  "reporting": {
    "outputDir": "./qabot-reports",
    "openAfterRun": true,
    "history": true,
    "formats": ["html", "json"]
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4o",
    "apiKeyEnv": "OPENAI_API_KEY"
  },
  "useCases": {
    "dir": "./docs/use-cases",
    "formats": ["md", "feature", "txt"]
  }
}
```

---

## Reports

QABot generates beautiful interactive reports after each test run:

- **HTML Report** — Visual dashboard with pass/fail charts, duration breakdown, and test details
- **JSON Report** — Machine-readable results for CI/CD integration
- **Historical Tracking** — Compare results across runs to spot regressions
- **Auto-Open** — Reports open in your browser automatically (configurable)

View reports anytime:

```bash
qabot report
```

Reports are saved to `./qabot-reports/` organized by date and feature.

---

## Environment Variables

Create a `.env` file in your project root (see `.env.example`):

```env
# AI Providers (set the one you use)
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GEMINI_API_KEY=your-gemini-key-here
DEEPSEEK_API_KEY=your-deepseek-key-here
GROQ_API_KEY=gsk_your-groq-key-here
PROXY_API_KEY=your-proxy-key-here

# E2E Test Credentials
E2E_TEST_EMAIL=testuser@example.com
E2E_TEST_PASSWORD=your-test-password
```

---

## Architecture

```
qabot/
├── bin/
│   └── qabot.js              # CLI entry point
├── src/
│   ├── ai/                   # AI engine & prompt builders
│   │   ├── ai-engine.js      # Multi-provider AI client
│   │   ├── prompt-builder.js  # Test analysis/generation prompts
│   │   └── usecase-parser.js  # Use case file parser
│   ├── analyzers/             # Project analysis
│   │   ├── project-analyzer.js
│   │   ├── test-detector.js
│   │   ├── feature-detector.js
│   │   └── env-detector.js
│   ├── cli/commands/          # CLI command handlers
│   ├── core/                  # Config, constants, logger
│   ├── e2e/                   # E2E test generation
│   ├── executor/              # Test execution engine
│   ├── reporter/              # HTML/JSON report generation
│   ├── runners/               # Test framework runners
│   │   ├── base-runner.js     # Runner interface
│   │   ├── jest-runner.js
│   │   ├── vitest-runner.js
│   │   ├── playwright-runner.js
│   │   ├── pytest-runner.js
│   │   └── dotnet-runner.js
│   └── utils/
├── templates/                 # Config templates
└── tests/                     # QABot's own test suite
```

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m "feat: add my feature"`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a Pull Request

### Development

```bash
git clone https://github.com/hoainho/qabot.git
cd qabot
npm install
npm test
npm run dev
```

---

## Roadmap

- [ ] GitHub Actions integration (auto-run on PR)
- [ ] Slack/Discord notifications for test results
- [ ] Visual regression testing support
- [ ] Test coverage mapping and gap analysis
- [ ] Custom reporter plugins
- [ ] CI/CD pipeline templates

---

## License

[MIT](./LICENSE) - Copyright (c) 2025 Hoai Nho

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/hoainho">Hoai Nho</a>
</p>
