# E2E Testing Guide

This document explains how to run end-to-end (E2E) tests for My AI Agency Office using Playwright.

## Overview

E2E tests cover 5 critical user flows:

1. **Owner Login → Dashboard → 3D Lobby → Click Avatar → Chat** (`owner-login-dashboard-lobby-chat.spec.ts`)
2. **Owner Creates Project → Brief → Plan → Gate Approvals → Dispatch → Kanban** (`owner-project-creation.spec.ts`)
3. **Client Login → Portal → Project Detail → Chat → Download Invoice** (`client-portal.spec.ts`)
4. **Owner Creates Division Proposal → 1-Click Approve → Verify Migration** (`division-proposal.spec.ts`)
5. **Owner Admin → Settings → Feature Flags → Audit Logs → Export CSV** (`admin-features.spec.ts`)

## Prerequisites

- Node.js 22+
- PostgreSQL database (local Docker or cloud)
- All dependencies installed (`npm ci`)

## Local Development

### 1. Start Required Services

```bash
# Start PostgreSQL (if using Docker)
docker run -d \
  --name myagency-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=myagency \
  -p 5432:5432 \
  postgres:16-alpine

# Or use Supabase local
npx supabase start
```

### 2. Set Up Environment

Copy `.env.example` to `.env.local` and configure:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myagency
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-min-32-chars
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NINE_ROUTER_API_KEY=your-9router-key
```

### 3. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed test data (creates owner@myagency.local / password123 and client@demo.local / client123)
npm run db:seed
```

### 4. Start Development Server

```bash
# Terminal 1: Start dev server (includes Socket.io on port 3001)
npm run dev
```

### 5. Run E2E Tests

In a separate terminal:

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with visible browser (headed)
npm run test:e2e:headed

# Run with Playwright UI for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/owner-login-dashboard-lobby-chat.spec.ts

# Run specific test with headed mode
npx playwright test e2e/owner-login-dashboard-lobby-chat.spec.ts --headed
```

## Test Users

The seed script creates these test users:

| Role | Email | Password |
|------|-------|----------|
| OWNER | owner@myagency.local | password123 |
| CLIENT | client@demo.local | client123 |

## CI/CD (GitHub Actions)

The CI pipeline runs automatically on push to `master`/`main` and on PRs.

### Workflow Stages

1. **Lint & TypeCheck** - ESLint + TypeScript compilation check
2. **Unit Tests** - Vitest with PostgreSQL service
3. **Build** - Next.js production build
4. **E2E Tests** - Playwright with PostgreSQL service
5. **All Checks** - Aggregates results

### CI Configuration

The workflow uses `postgres:16-alpine` as a GitHub Actions service container. Tests run with:

- `baseURL: http://localhost:3000`
- Dev server started via `webServer` in `playwright.config.ts`
- `trace: on-first-retry` for debugging failures
- Chromium, Firefox, and WebKit projects

### Artifacts

On E2E test failure, these artifacts are uploaded:
- Playwright HTML report (7 days retention)
- Traces and screenshots (7 days retention)

## Playwright Configuration

Key settings in `playwright.config.ts`:

```typescript
{
  testDir: "./e2e",
  baseURL: "http://localhost:3000",
  retries: process.env.CI ? 2 : 0,
  projects: ["chromium", "firefox", "webkit"],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:next",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  }
}
```

## Writing New E2E Tests

### File Structure

```
e2e/
├── owner-login-dashboard-lobby-chat.spec.ts
├── owner-project-creation.spec.ts
├── client-portal.spec.ts
├── division-proposal.spec.ts
└── admin-features.spec.ts
```

### Best Practices

1. **Use test users** from seed data
2. **Unique data per test** - use timestamps in project names
3. **Wait for elements** - use `waitForSelector` with `data-testid`
4. **Clean up** - tests should be independent
5. **Assert visible state** - not just DOM presence

### Example Test Pattern

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "owner@myagency.local");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("user can do something", async ({ page }) => {
    await page.goto("/some-page");
    await page.waitForSelector('[data-testid="element"]');
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

## Debugging Failures

### Local Debugging

```bash
# Run with UI mode (interactive)
npm run test:e2e:ui

# Run headed with slow motion
npx playwright test --headed --slow-mo=1000

# Debug specific test
npx playwright test e2e/owner-login-dashboard-lobby-chat.spec.ts --debug
```

### CI Debugging

1. Download the **playwright-report** artifact from the failed workflow run
2. Open `playwright-report/index.html` in browser
3. Click on failed test to see trace, screenshots, and video
4. Use trace viewer: `npx playwright show-trace trace.zip`

## Test Data Isolation

Each test should:
- Use unique project names (`${Date.now()}`)
- Not depend on other tests' data
- Clean up in `afterEach` if creating persistent data

## Common Issues

### "Connection refused" to database
- Ensure PostgreSQL is running on port 5432
- Check `DATABASE_URL` in `.env.local`

### "Timeout waiting for element"
- Increase timeout in test or config
- Check if dev server is fully started
- Verify element has `data-testid` attribute

### "Port 3000 already in use"
- Kill existing process: `lsof -ti:3000 | xargs kill -9`
- Or use different port in config

### WebGL errors in headless CI
- Tests use DOM fallback when WebGL unavailable
- R3F canvas is conditionally rendered
- Mobile fallback list is always in DOM

## Extending Coverage

To add new E2E tests:
1. Create new `.spec.ts` file in `e2e/`
2. Follow existing patterns
3. Add `data-testid` attributes to components being tested
4. Run locally to verify
5. CI will automatically pick up new tests

## Performance Tips

- Run tests in parallel (default)
- Use `reuseExistingServer: true` locally
- Limit browsers in CI if needed: `projects: ["chromium"]`
- Use `--workers=1` for flaky tests

## Reporting

- HTML report: `npx playwright show-report`
- JUnit XML: Add `reporter: [["junit", { outputFile: "results.xml" }]]` to config
- Allure: `npx playwright test --reporter=allure`

---

For questions or issues, check the [Playwright docs](https://playwright.dev/docs/intro) or the project's GitHub issues.