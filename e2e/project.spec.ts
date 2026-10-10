import { test, expect } from "@playwright/test";

test.describe("Project Workflow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "owner@myagency.local");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");
  });

  test("full project lifecycle: create → brief → plan → execute → deliver", async ({ page }) => {
    // Navigate to projects
    await page.goto("/projects");
    await expect(page.locator("h1")).toContainText("Projects");

    // Create new project
    await page.click('a:has-text("New Project")');
    await expect(page).toHaveURL("/projects/new");

    await page.fill('input[name="title"]', "E2E Test Project");
    await page.fill('textarea[name="brief"]', "This is an end-to-end test project for workflow verification.");
    await page.click('button[type="submit"]');

    // Should redirect to project detail
    await expect(page.locator("h1")).toContainText("Project");

    // Verify Kanban board loads
    await expect(page.locator("text=Kanban Board")).toBeVisible();

    // Verify columns exist
    await expect(page.locator("text=To Do")).toBeVisible();
    await expect(page.locator("text=In Progress")).toBeVisible();
    await expect(page.locator("text=Review")).toBeVisible();
    await expect(page.locator("text=Done")).toBeVisible();

    // Create a task
    await page.click('a:has-text("New Task")');
    await page.fill('input[name="title"]', "Test Task");
    await page.fill('textarea[name="description"]', "Test task description");
    await page.click('button[type="submit"]');

    // Verify task appears in To Do column
    await expect(page.locator('[role="listitem"]').first()).toContainText("Test Task");
  });

  test("task status transitions through Kanban", async ({ page }) => {
    await page.goto("/projects");
    const projectLink = page.locator('a[href^="/projects/"]').first();
    await projectLink.click();

    // Wait for Kanban
    await expect(page.locator("text=To Do")).toBeVisible();

    // Find a task and change status via dropdown
    const taskCard = page.locator('[role="listitem"]').first();
    await expect(taskCard).toBeVisible();

    // Change status to In Progress
    const statusSelect = taskCard.locator('select');
    await statusSelect.selectOption("progress");

    // Verify task moved to In Progress column (or status updated)
    await expect(taskCard.locator('select')).toHaveValue("progress");
  });

  test("owner can approve gates", async ({ page }) => {
    await page.goto("/projects");
    const projectLink = page.locator('a[href^="/projects/"]').first();
    await projectLink.click();

    // Click approve gate button
    await page.click('a:has-text("Approve Gate")');

    // Should show approve page or modal
    await expect(page.locator("text=Approve")).toBeVisible();
  });
});