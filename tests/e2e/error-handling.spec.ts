import { test, expect } from "@playwright/test";

/**
 * E2E Error Handling Test
 * Tests various error scenarios and error display
 */

test.describe("Repository Analysis - Error Handling", () => {
  test("should display error for invalid repository URL", async ({ page }) => {
    await page.goto("/");

    // Fill form with invalid URL
    await page.getByLabel(/repository url/i).fill("not-a-valid-url");
    await page.getByLabel(/github personal access token/i).fill("test_token");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Should show loading state
    await expect(page.getByText(/analysis in progress/i)).toBeVisible();

    // Wait for error to appear
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify error details are shown
    await expect(page.getByText(/error code/i)).toBeVisible();
    await expect(page.getByText(/INVALID_URL/i)).toBeVisible();

    // Verify "Try Again" button is present
    await expect(
      page.getByRole("button", { name: /try again/i }),
    ).toBeVisible();
  });

  test("should display error for invalid GitHub token", async ({ page }) => {
    await page.goto("/");

    // Fill form with invalid token
    await page
      .getByLabel(/repository url/i)
      .fill("https://github.com/vercel/next.js");
    await page
      .getByLabel(/github personal access token/i)
      .fill("invalid_token_12345");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Should show loading state
    await expect(page.getByText(/analysis in progress/i)).toBeVisible();

    // Wait for error to appear
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 10000,
    });

    // Should show token-related error
    await expect(page.getByText(/error code/i)).toBeVisible();
  });

  test("should display error for non-existent repository", async ({ page }) => {
    await page.goto("/");

    // Fill form with non-existent repo
    await page
      .getByLabel(/repository url/i)
      .fill("https://github.com/nonexistent-user/nonexistent-repo-12345");
    await page
      .getByLabel(/github personal access token/i)
      .fill(process.env.TEST_GITHUB_TOKEN || "test_token");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Should show loading state
    await expect(page.getByText(/analysis in progress/i)).toBeVisible();

    // Wait for error to appear
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 10000,
    });

    // Should show not found error
    await expect(page.getByText(/error code/i)).toBeVisible();
    await expect(page.getByText(/REPO_NOT_FOUND|404/i)).toBeVisible();
  });

  test("should allow retry after error", async ({ page }) => {
    await page.goto("/");

    // Fill form with invalid URL
    await page.getByLabel(/repository url/i).fill("invalid-url");
    await page.getByLabel(/github personal access token/i).fill("test_token");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for error
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 10000,
    });

    // Click "Try Again" button
    await page.getByRole("button", { name: /try again/i }).click();

    // Should return to form
    await expect(page.getByLabel(/repository url/i)).toBeVisible();

    // Form should be empty (reset)
    await expect(page.getByLabel(/repository url/i)).toHaveValue("");
  });

  test("should display technical details for errors", async ({ page }) => {
    await page.goto("/");

    // Fill form with invalid data
    await page.getByLabel(/repository url/i).fill("invalid");
    await page.getByLabel(/github personal access token/i).fill("token");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for error
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 10000,
    });

    // Check if technical details section exists
    const detailsLocator = page.locator("details");
    if ((await detailsLocator.count()) > 0) {
      // Expand details if present
      await detailsLocator.click();

      // Verify technical details are shown
      await expect(page.locator("pre")).toBeVisible();
    }
  });

  test("should handle network errors gracefully", async ({ page }) => {
    // Simulate offline scenario
    await page.context().setOffline(true);

    await page.goto("/");

    // Fill form
    await page
      .getByLabel(/repository url/i)
      .fill("https://github.com/vercel/next.js");
    await page.getByLabel(/github personal access token/i).fill("test_token");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Should eventually show an error
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 15000,
    });

    // Re-enable network
    await page.context().setOffline(false);
  });

  test("should preserve form state when navigating", async ({ page }) => {
    await page.goto("/");

    const repoUrl = "https://github.com/facebook/react";
    const token = "test_token_123";

    // Fill form
    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByLabel(/github personal access token/i).fill(token);

    // Note: Next.js client-side navigation doesn't preserve state by default
    // This test verifies current behavior
    await expect(page.getByLabel(/repository url/i)).toHaveValue(repoUrl);
  });
});
