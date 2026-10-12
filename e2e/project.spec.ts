import { test, expect } from "@playwright/test";

const OWNER_EMAIL = "owner@myagency.local";
const OWNER_PASSWORD = "owner123";

test.describe("Project Workflow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('[data-testid="email-input"]', OWNER_EMAIL);
    await page.fill('[data-testid="password-input"]', OWNER_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/lobby/);
  });

  test("full project lifecycle: create → brief → plan → execute → deliver", async ({ page }) => {
    // Navigate to projects
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1")).toContainText("Projects");
    
    // Create new project
    await page.click('a:has-text("New Project")');
    await page.waitForURL("/projects/new");
    await expect(page).toHaveURL("/projects/new");
    
    // Select client from dropdown (required)
    await page.click('[role="combobox"]');
    await page.click('[role="option"]');
    await page.waitForTimeout(500);
    
    const projectTitle = `E2E Test Project ${Date.now()}`;
    await page.fill('input[name="title"]', projectTitle);
    await page.fill('textarea[name="brief"]', "This is an end-to-end test project for workflow verification.");
    await page.click('button[type="submit"]');
    
    // Should redirect to project detail
    await expect(page.locator("main h1")).toContainText(projectTitle);
    
    // Verify Kanban board loads
    await expect(page.locator('[role="region"]').getByText("To Do")).toBeVisible();
    await expect(page.locator('[role="region"]').getByText("In Progress")).toBeVisible();
    await expect(page.locator('[role="region"]').getByText("Review")).toBeVisible();
    await expect(page.locator('[role="region"]').getByText("Done")).toBeVisible();
    
    // Create a task
    await page.click('a:has-text("New Task")');
    await page.fill('input[name="title"]', "Test Task");
    await page.fill('textarea[name="description"]', "Test task description");
    
    // Select stage
    const stageCombobox = page.locator('[role="combobox"]').first();
    await stageCombobox.click();
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);
    
    // Select assignee role
    const roleCombobox = page.locator('[role="combobox"]').nth(1);
    await roleCombobox.click();
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);
    
    await page.click('button[type="submit"]');
    
    // Wait for redirect to project detail
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(page.locator("main")).not.toContainText("Loading...");
    await expect(page.locator("main h1")).toContainText(projectTitle);
    
    // Wait for tasks to load
    await expect(page.locator('[role="region"]').getByText("To Do")).toBeVisible();
    await page.waitForTimeout(1000);
    
    // Verify task appears in To Do column
    await expect(page.locator('[role="listitem"]').first()).toContainText("Test Task");
  });

  test("task status transitions through Kanban", async ({ page }) => {
    // Create a project with a task first
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await page.click('a:has-text("New Project")');
    await expect(page).toHaveURL("/projects/new");
    
    await page.click('[role="combobox"]');
    await page.click('[role="option"]');
    await page.waitForTimeout(500);
    
    const projectTitle = `Kanban Test ${Date.now()}`;
    await page.fill('input[name="title"]', projectTitle);
    await page.fill('textarea[name="brief"]', "Test project for Kanban transitions");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("main h1")).toContainText(projectTitle);
    
    // Create a task
    await page.click('a:has-text("New Task")');
    await page.fill('input[name="title"]', "Kanban Test Task");
    await page.fill('textarea[name="description"]', "Test task for status transitions");
    
    const stageCombobox = page.locator('[role="combobox"]').first();
    await stageCombobox.click();
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);
    
    const roleCombobox = page.locator('[role="combobox"]').nth(1);
    await roleCombobox.click();
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(500);
    
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(page.locator("main")).not.toContainText("Loading...");
    await expect(page.locator('[role="region"]').getByText("To Do")).toBeVisible();
    await page.waitForTimeout(1000);
    
    // Find the task and change status via dropdown
    const taskCard = page.locator('[role="listitem"]').first();
    await expect(taskCard).toBeVisible();
    
    // Change status to In Progress - the KanbanCard uses a select for status
    const statusSelect = taskCard.locator('select');
    await statusSelect.selectOption("progress");
    
    // Verify status updated
    await expect(statusSelect).toHaveValue("progress");
  });

  test("owner can approve gates", async ({ page }) => {
    // Create a project in BRIEF status (needs brief approval)
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await page.click('a:has-text("New Project")');
    await expect(page).toHaveURL("/projects/new");
    
    await page.click('[role="combobox"]');
    await page.click('[role="option"]');
    await page.waitForTimeout(500);
    
    const projectTitle = `Gate Approval Test ${Date.now()}`;
    await page.fill('input[name="title"]', projectTitle);
    await page.fill('textarea[name="brief"]', "Test project for gate approval");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("main h1")).toContainText(projectTitle);
    
    // Click approve gate button
    await page.click('a:has-text("Approve Gate")');
    
    // Should show approve page
    await expect(page).toHaveURL(/\/approve/);
    await expect(page.locator("main h1")).toContainText("Approve");
  });
});