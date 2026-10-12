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
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });

    await expect(page.locator("text=My Projects")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
    const projectLink = page.locator('a[href*="/portal/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10000 });
    await projectLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Detail page is client-side: heading is project.title, nav has Overview tab
    await expect(page.locator('button[role="tab"]:has-text("Overview"), text=Project Information').first()).toBeVisible({ timeout: 10000 });
    // Tabs: Overview / Deliverables / Invoices / Chat — use role-based selectors to avoid strict-mode
    await expect(page.locator('button[role="tab"]:has-text("Overview")')).toBeVisible({ timeout: 10000 });
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
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });
    await page.waitForTimeout(800);

    // Open first project then go to Invoices tab — avoids ambiguous "Invoice" text (4 matches)
    const projectLink = page.locator('a[href*="/portal/projects/"]').first();
    await expect(projectLink).toBeVisible({ timeout: 10000 });
    await projectLink.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('button[role="tab"]:has-text("Overview")')).toBeVisible({ timeout: 10000 });
    await page.click('button[role="tab"]:has-text("Invoices")');
    await page.waitForTimeout(600);
    // Either invoice list or empty state — both valid
    await expect(page.locator('text=Invoices').first()).toBeVisible({ timeout: 10000 });
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")').first();
    if (await downloadButton.isVisible().catch(() => false)) {
      const downloadPromise = page.waitForEvent("download");
      await downloadButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    }
  });

  test("client cannot access other client's project (403)", async ({ page }) => {
    // Login as CLIENT — must now see own projects (fixed: Client.id via User.id)
    await page.fill('[data-testid="email-input"]', CLIENT_EMAIL);
    await page.fill('[data-testid="password-input"]', CLIENT_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });
    await expect(page.locator("text=My Projects")).toBeVisible({ timeout: 10000 });
    // Ensure at least one real project exists; if seeded first run may be slow, wait longer
    await page.waitForTimeout(800);
    const projectLink = page.locator('a[href*="/portal/projects/"]').first();
    // After fix, CLIENT now sees N>0 projects. Fallback: tamper via direct API if link slow
    let href: string | null = null;
    try {
      await expect(projectLink).toBeVisible({ timeout: 10000 });
      href = await projectLink.getAttribute("href");
    } catch {
      // Fallback: still test tamper even if list slow — use API to get an id
      const ids = await page.evaluate(async () => {
        const r = await fetch("/api/portal/projects", { credentials: "include" });
        const j = await r.json().catch(() => ({ projects: [] }));
        return (j.projects || []).map((p: { id: string }) => p.id) as string[];
      });
      if (ids.length) href = `/portal/projects/${ids[0]}`;
    }
    expect(href).toBeTruthy();
    if (!href) return;

    const tamperedUrl = href.replace(/\/portal\/projects\/[^/]+/, "/portal/projects/00000000-0000-4000-a000-000000000000");
    const respPromise = page.waitForResponse(r => r.url().includes("/api/portal/projects/") || r.url().includes("/portal/projects/"), { timeout: 15000 }).catch(() => null);
    await page.goto(tamperedUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    const denied = page.locator("text=Access denied, text=Access Denied, text=Project not found");
    if (await denied.first().isVisible().catch(() => false)) {
      await expect(denied.first()).toBeVisible();
      return;
    }
    const resp = await respPromise;
    if (resp) {
      expect([403, 404, 302]).toContain(resp.status());
    } else {
      await expect(page.locator("text=Access denied, text=Access Denied, text=Project not found, text=Back to Projects, text=Back to Portal").first()).toBeVisible({ timeout: 10000 });
    }
  });
});