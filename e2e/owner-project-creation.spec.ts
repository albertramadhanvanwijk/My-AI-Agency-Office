import { test, expect } from "@playwright/test";

const OWNER_EMAIL = "owner@myagency.local";
const OWNER_PASSWORD = "password123";

test.describe("Owner Creates Project → Brief → Plan → Gate Approvals → Dispatch → Kanban", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    
    // Login as owner
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', OWNER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("owner can create a new project with brief", async ({ page }) => {
    // Navigate to projects
    await page.goto("/projects");
    await expect(page.locator("h1")).toContainText("Projects");
    
    // Click new project
    await page.click('a:has-text("New Project")');
    await expect(page).toHaveURL(/\/projects\/new/);
    
    // Fill project form
    const projectTitle = `E2E Test Project ${Date.now()}`;
    await page.fill('input[name="title"]', projectTitle);
    await page.fill('textarea[name="brief"]', "This is an end-to-end test project for workflow verification. We need a company profile website with modern design.");
    await page.click('button[type="submit"]');
    
    // Should redirect to project detail
    await expect(page.locator("h1")).toContainText("Project");
    
    // Verify project title appears
    await expect(page.locator("text=" + projectTitle)).toBeVisible();
  });

  test("project goes through brief → planning → gate approvals", async ({ page }) => {
    // Navigate to projects and create one
    await page.goto("/projects");
    await page.click('a:has-text("New Project")');
    
    const projectTitle = `Gate Test ${Date.now()}`;
    await page.fill('input[name="title"]', projectTitle);
    await page.fill('textarea[name="brief"]', "Test project for gate approvals flow");
    await page.click('button[type="submit"]');
    
    // Wait for project detail page
    await expect(page.locator("h1")).toContainText("Project");
    
    // Navigate to project detail if not there
    const projectUrl = page.url();
    
    // Verify Kanban board loads
    await expect(page.locator("text=Kanban Board")).toBeVisible();
    await expect(page.locator("text=To Do")).toBeVisible();
    await expect(page.locator("text=In Progress")).toBeVisible();
    await expect(page.locator("text=Review")).toBeVisible();
    await expect(page.locator("text=Done")).toBeVisible();
    
    // Check for gate approval buttons
    await expect(page.locator('a:has-text("Approve Gate")')).toBeVisible();
    
    // Click approve gate
    await page.click('a:has-text("Approve Gate")');
    
    // Should show approve page or modal
    await expect(page.locator("text=Approve")).toBeVisible();
  });

  test("owner can dispatch tasks and see them on Kanban", async ({ page }) => {
    // Navigate to projects and create one
    await page.goto("/projects");
    await page.click('a:has-text("New Project")');
    
    const projectTitle = `Dispatch Test ${Date.now()}`;
    await page.fill('input[name="title"]', projectTitle);
    await page.fill('textarea[name="brief"]', "Test project for task dispatch");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("h1")).toContainText("Project");
    
    // Create a task
    await page.click('a:has-text("New Task")');
    await page.fill('input[name="title"]', "Design Homepage");
    await page.fill('textarea[name="description"]', "Create modern homepage design");
    await page.click('button[type="submit"]');
    
    // Verify task appears in To Do column
    await expect(page.locator('[role="listitem"]').first()).toContainText("Design Homepage");
    
    // Move task through Kanban
    const taskCard = page.locator('[role="listitem"]').first();
    const statusSelect = taskCard.locator('select');
    await statusSelect.selectOption("progress");
    await expect(statusSelect).toHaveValue("progress");
    
    await statusSelect.selectOption("review");
    await expect(statusSelect).toHaveValue("review");
    
    await statusSelect.selectOption("done");
    await expect(statusSelect).toHaveValue("done");
  });

  test("provisional division proposal flow", async ({ page }) => {
    // Navigate to proposals
    await page.goto("/proposals");
    await expect(page.locator("h1")).toContainText("Proposals");
    
    // Check if there's a provisional division proposal (from gap check)
    // The proposal list should show pending proposals
    await expect(page.locator("text=Pending")).toBeVisible();
  });
});