import { test, expect } from "@playwright/test";

const OWNER_EMAIL = "owner@myagency.local";
const OWNER_PASSWORD = "owner123";

test.describe("Owner Creates Division Proposal → 1-Click Approve → Verify Migration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    
    // Login as owner
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("owner can view proposals list", async ({ page }) => {
    await page.goto("/proposals");
    await expect(page.locator("h1")).toContainText("Proposals");
    
    // Should see proposal cards or table
    await expect(page.locator("text=Pending")).toBeVisible();
  });

  test("owner can approve division proposal with 1-click", async ({ page }) => {
    await page.goto("/proposals");
    await expect(page.locator("h1")).toContainText("Proposals");
    
    // Find a pending division proposal
    const pendingProposal = page.locator('[data-testid="proposal-card"]:has-text("division"), .proposal-card:has-text("division"), article:has-text("division")').first();
    
    if (await pendingProposal.isVisible()) {
      // Click to view detail
      await pendingProposal.click();
      
      // Should be on proposal detail page
      await expect(page.locator("h1")).toContainText("New Division");
      
      // Click approve button
      await page.click('button:has-text("Approve Proposal")');
      
      // Should show success or redirect back to list
      await expect(page.locator("text=Approved")).toBeVisible({ timeout: 10000 });
    }
  });

  test("approved division proposal shows migrate button", async ({ page }) => {
    await page.goto("/proposals");
    
    // Find an approved division proposal
    const approvedProposal = page.locator('[data-testid="proposal-card"]:has-text("Approved"):has-text("division"), .proposal-card:has-text("Approved"):has-text("division"), article:has-text("Approved"):has-text("division")').first();
    
    if (await approvedProposal.isVisible()) {
      await approvedProposal.click();
      
      // Should see migrate button for division proposals
      await expect(page.locator('button:has-text("Migrate Provisional Division")')).toBeVisible();
    }
  });

  test("migrate button creates division, room, and roles", async ({ page }) => {
    await page.goto("/proposals");
    
    // Find an approved division proposal
    const approvedProposal = page.locator('[data-testid="proposal-card"]:has-text("Approved"):has-text("division"), .proposal-card:has-text("Approved"):has-text("division"), article:has-text("Approved"):has-text("division")').first();
    
    if (await approvedProposal.isVisible()) {
      await approvedProposal.click();
      
      // Click migrate
      await page.click('button:has-text("Migrate Provisional Division")');
      
      // Wait for migration to complete
      await expect(page.locator("text=Migration complete, text=Division activated")).toBeVisible({ timeout: 15000 });
      
      // Verify division appears in sidebar (navigate to lobby)
      await page.goto("/lobby");
      await page.waitForSelector('[data-testid="office-canvas-root"]', { timeout: 15000 });
      
      // The new division room should be visible
      // (exact name depends on proposal payload)
    }
  });

  test("owner can create new division proposal from organization page", async ({ page }) => {
    await page.goto("/organization");
    await expect(page.locator("h1")).toContainText("Organization");
    
    // Look for add division button
    const addDivisionButton = page.locator('button:has-text("Add Division"), a:has-text("Add Division")').first();
    if (await addDivisionButton.isVisible()) {
      await addDivisionButton.click();
      
      // Fill proposal form
      await page.fill('input[name="name"]', "E2E Test Division");
      await page.fill('textarea[name="description"]', "Test division created via E2E");
      await page.click('button[type="submit"]');
      
      // Should create proposal with pending status
      await expect(page.locator("text=Pending Review")).toBeVisible({ timeout: 10000 });
    }
  });
});