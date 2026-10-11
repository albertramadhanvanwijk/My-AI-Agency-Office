import { test, expect } from "@playwright/test";

const OWNER_EMAIL = "owner@myagency.local";
const OWNER_PASSWORD = "owner123";

test.describe("Owner Login → Dashboard → 3D Lobby → Click Avatar → Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
  });

  test("owner can login and access dashboard", async ({ page }) => {
    // Login with credentials
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("owner can navigate to lobby and see 3D office", async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to lobby
    await page.click('a:has-text("Lobby")');
    await expect(page).toHaveURL(/\/lobby/);
    
    // Wait for 3D canvas to load
    await page.waitForSelector('[data-testid="office-canvas-root"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="office-canvas-root"]')).toBeVisible();
    
    // Check for lobby room
    await expect(page.locator("text=LOBBY")).toBeVisible();
    
    // Check active staff count badge
    await expect(page.locator('[data-testid="office-canvas-root"] >> text=/active/')).toBeVisible();
  });

  test("owner can click avatar in lobby and open chat drawer", async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to lobby
    await page.click('a:has-text("Lobby")');
    await expect(page).toHaveURL(/\/lobby/);
    
    // Wait for 3D canvas
    await page.waitForSelector('[data-testid="office-canvas-root"]', { timeout: 15000 });
    
    // Wait for avatars to render (active staff)
    await page.waitForSelector('[data-testid="office-canvas-root"] >> text=Rina Anggraini', { timeout: 10000 });
    
    // Click on an active avatar (Rina - receptionist)
    await page.click('[data-testid="office-canvas-root"] >> text=Rina Anggraini');
    
    // Chat drawer should open
    await expect(page.locator('[data-testid="chat-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-drawer"] >> text=Rina Anggraini')).toBeVisible();
    
    // Chat drawer should show status as active
    await expect(page.locator('[data-testid="chat-drawer"] >> text=active')).toBeVisible();
  });

  test("owner can click room and see staff drawer", async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to lobby
    await page.click('a:has-text("Lobby")');
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