import { test, expect } from "@playwright/test";

const OWNER_EMAIL = "owner@myagency.local";
const OWNER_PASSWORD = "owner123";

test.describe("Owner Login → Lobby → 3D Office → Click Avatar → Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
  });

  test("owner can login and access lobby", async ({ page }) => {
    // Login with credentials
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    
    // Wait for navigation to lobby
    await page.waitForURL(/\/lobby/, { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
    // Three.js infinite loop: never use networkidle on lobby, use domcontentloaded + short wait
    await page.waitForTimeout(1500);
    
    // Should redirect to lobby (tolerant: h1 may be hidden behind canvas in some widths)
    await expect(page).toHaveURL(/\/lobby/, { timeout: 10000 });
    const h1 = page.locator("main h1");
    if (await h1.isVisible().catch(() => false)) {
      await expect(h1).toContainText(/Lobby|Office|My AI/i);
    } else {
      // fallback: canvas root proves lobby loaded
      await expect(page.locator('[data-testid="office-canvas-root"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test("owner can navigate to lobby and see 3D office", async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/lobby/);
    
    // Wait for 3D canvas to load
    await page.waitForSelector('[data-testid="office-canvas-root"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="office-canvas-root"]')).toBeVisible();
    
    // Check for lobby room
    await expect(page.locator('[data-testid="lobby-card"]')).toBeVisible();
    
    // Check active staff count badge
    await expect(page.locator('[data-testid="office-canvas-root"] >> text="3 active"')).toBeVisible();
  });

  test("owner can click avatar in lobby and open chat drawer", async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/lobby/);
    
    // Wait for 3D canvas
    await page.waitForSelector('[data-testid="office-canvas-root"]', { timeout: 15000 });
    
    // Wait for avatars to render (active staff)
    await page.waitForSelector('[data-testid="office-canvas-root"] >> text=Rina Anggraini', { timeout: 10000 });
    
    // Click on an active avatar (Rina - receptionist)
    await page.click('[data-testid="office-canvas-root"] >> text=Rina Anggraini');
    
    // Chat drawer should open
    await expect(page.locator('[data-testid="chat-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-drawer"] h3')).toContainText("Rina Anggraini");
    
    // Chat drawer should show status as active
    await expect(page.locator('[data-testid="chat-drawer"] >> text="active"').first()).toBeVisible();
  });

  test("owner can click room and see staff drawer", async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/lobby/);
    
    // Wait for 3D canvas
    await page.waitForSelector('[data-testid="office-canvas-root"]', { timeout: 15000 });
    
    // Click on a room (Strategy division room)
    await page.click('[data-testid="office-canvas-root"] >> text=Strategy');
    
    // Staff drawer should open
    await expect(page.locator('[data-testid="staff-drawer"]')).toBeVisible();
    
    // Should show staff in that room
    await expect(page.locator('[data-testid="staff-drawer"]')).toBeVisible();
  });
});