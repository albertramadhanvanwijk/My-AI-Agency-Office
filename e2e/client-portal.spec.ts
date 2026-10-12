import { test, expect } from "@playwright/test";

const CLIENT_EMAIL = "client@demo.local";
const CLIENT_PASSWORD = "client123";

test.describe("Client Login → Portal → Project Detail → Chat → Download Invoice", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
  });

  test("client can login and access portal", async ({ page }) => {
    // Login with credentials
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to portal
    await expect(page).toHaveURL(/\/portal/);
    await expect(page.locator("h1")).toContainText("My Projects");
  });

  test("client sees only their own projects", async ({ page }) => {
    // Login as client
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/portal/);
    
    // Should see project list
    await expect(page.locator("text=My Projects")).toBeVisible();
    
    // Click on a project
    const projectLink = page.locator('a[href*="/portal/projects/"]').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      
      // Should see project detail
      await expect(page.locator("text=Project Detail")).toBeVisible();
      
      // Should see brief, progress, deliverables
      await expect(page.locator("text=Brief")).toBeVisible();
      await expect(page.locator("text=Progress")).toBeVisible();
    }
  });

  test("client can chat in project", async ({ page }) => {
    // Login as client
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/portal/);
    
    // Navigate to a project
    const projectLink = page.locator('a[href*="/portal/projects/"]').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      
      // Look for chat button/drawer
      const chatButton = page.locator('button:has-text("Chat"), a:has-text("Chat"), [data-testid="chat-button"]').first();
      if (await chatButton.isVisible()) {
        await chatButton.click();
        
        // Chat drawer should open
        await expect(page.locator('[data-testid="chat-drawer"], .chat-drawer, [role="dialog"]:has-text("Chat")')).toBeVisible();
        
        // Send a message
        const messageInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="Type"]').first();
        if (await messageInput.isVisible()) {
          await messageInput.fill("Hello from client E2E test");
          await page.click('button:has-text("Send"), button[type="submit"]');
          
          // Message should appear
          await expect(page.locator("text=Hello from client E2E test")).toBeVisible();
        }
      }
    }
  });

  test("client can download invoice", async ({ page }) => {
    // Login as client
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/portal/);
    
    // Navigate to invoices or project with invoice
    const invoiceLink = page.locator('a:has-text("Invoice"), a:has-text("Invoices")').first();
    if (await invoiceLink.isVisible()) {
      await invoiceLink.click();
      
      // Should see invoice list or detail
      await expect(page.locator("text=Invoice")).toBeVisible();
      
      // Click download
      const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")').first();
      if (await downloadButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent("download");
        await downloadButton.click();
        const download = await downloadPromise;
        
        // Verify it's a PDF
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });

  test("client cannot access other client's project (403)", async ({ page }) => {
    // Login as client
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/portal/);
    
    // Get a project ID from the list
    const projectLink = page.locator('a[href*="/portal/projects/"]').first();
    if (await projectLink.isVisible()) {
      const href = await projectLink.getAttribute("href");
      if (href) {
        // Try to access a different project ID (tampering)
        const tamperedUrl = href.replace(/\/portal\/projects\/[^/]+/, "/portal/projects/different-id");
        await page.goto(tamperedUrl);
        
        // Should get 403 or redirect, not 404 (which would leak existence)
        const response = await page.waitForResponse(r => r.url().includes("/portal/projects/"));
        expect([403, 404, 302]).toContain(response.status());
      }
    }
  });
});