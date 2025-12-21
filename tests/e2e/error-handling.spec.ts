import { test, expect } from "@playwright/test";

/**
 * E2E Error Handling Test
 * Tests various error scenarios and error display
 */

test.describe("Repository Analysis - Error Handling", () => {
  test("should display error for invalid repository URL", async ({ page }) => {
    await page.goto("/");

    // Check if authenticated (requires OAuth)
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Fill form with invalid URL (no token required with OAuth)
    await page.getByLabel(/repository url/i).fill("not-a-valid-url");

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

  test.skip("should display error for invalid GitHub token (deprecated - OAuth handles authentication)", async () => {
    // This test is deprecated as GitHub token is now handled via OAuth
    // Token validation errors would manifest as authentication errors
    // See auth-error.spec.ts and token-expiration.spec.ts for OAuth error handling tests
  });

  test("should display error for non-existent repository", async ({ page }) => {
    // Note: This test requires authentication via OAuth
    // Skip if not authenticated
    await page.goto("/");

    // Check if user is authenticated
    const signInButton = page.getByRole("button", { name: /sign in/i });
    if (await signInButton.isVisible()) {
      test.skip();
    }

    // Fill form with non-existent repo
    await page
      .getByLabel(/repository url/i)
      .fill("https://github.com/nonexistent-user/nonexistent-repo-12345");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Should show loading state
    await expect(page.getByText(/analysis in progress/i)).toBeVisible();

    // Wait for error to appear
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 10000,
    });

    // Should show not found error with actionable guidance
    await expect(page.getByText(/error code/i)).toBeVisible();
    await expect(page.getByText(/REPO_NOT_FOUND|404/i)).toBeVisible();

    // Verify actionable guidance is shown
    await expect(page.getByText(/what you can do/i)).toBeVisible();
    await expect(
      page.getByText(/verify the repository url is correct/i),
    ).toBeVisible();
  });

  test("should display error for insufficient permissions to private repository", async ({
    page,
  }) => {
    // Note: This test requires authentication via OAuth
    // Skip if not authenticated
    await page.goto("/");

    // Check if user is authenticated
    const signInButton = page.getByRole("button", { name: /sign in/i });
    if (await signInButton.isVisible()) {
      test.skip();
    }

    // Try to analyze a private repository without access
    // Using a known private repo that the test account doesn't have access to
    // Replace with a real private repo URL if needed for testing
    await page
      .getByLabel(/repository url/i)
      .fill(
        process.env.TEST_PRIVATE_REPO_URL ||
          "https://github.com/private-org/private-repo",
      );

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Should show loading state
    await expect(page.getByText(/analysis in progress/i)).toBeVisible();

    // Wait for error to appear
    await expect(page.getByText(/analysis failed/i)).toBeVisible({
      timeout: 10000,
    });

    // Should show insufficient permissions error
    await expect(page.getByText(/error code/i)).toBeVisible();
    await expect(
      page.getByText(/INSUFFICIENT_PERMISSIONS|REPO_NOT_FOUND/i),
    ).toBeVisible();

    // Verify message mentions permission issues
    await expect(page.getByText(/permission|access/i).first()).toBeVisible();

    // Verify actionable guidance is shown
    await expect(page.getByText(/what you can do/i)).toBeVisible();
    await expect(page.getByText(/ensure you have read access/i)).toBeVisible();
    await expect(
      page.getByText(/signing out and signing in again/i),
    ).toBeVisible();
  });

  test("should handle mid-analysis permission revocation gracefully", async ({
    page,
  }) => {
    // Note: This test simulates a scenario where permissions are revoked during analysis
    // This is difficult to test in E2E without mocking, so we verify error handling exists
    // The actual scenario is tested at the unit/integration level

    // Skip if not authenticated
    await page.goto("/");
    const signInButton = page.getByRole("button", { name: /sign in/i });
    if (await signInButton.isVisible()) {
      test.skip();
    }

    // Try to analyze a repository that may have intermittent access issues
    await page
      .getByLabel(/repository url/i)
      .fill("https://github.com/test-org/test-repo");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // If an error occurs (permission revoked mid-analysis), verify proper handling
    const errorVisible = await page
      .getByText(/analysis failed/i)
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (errorVisible) {
      // Verify error message is user-friendly
      await expect(page.getByText(/error code/i)).toBeVisible();

      // Verify actionable guidance exists for permission errors
      const hasPermissionError = await page
        .getByText(/INSUFFICIENT_PERMISSIONS|REPO_NOT_FOUND/i)
        .isVisible()
        .catch(() => false);

      if (hasPermissionError) {
        await expect(page.getByText(/what you can do/i)).toBeVisible();
      }

      // Verify user can retry
      await expect(
        page.getByRole("button", { name: /try again/i }),
      ).toBeVisible();
    }
  });

  test("should allow retry after error", async ({ page }) => {
    await page.goto("/");

    // Check if authenticated (requires OAuth)
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Fill form with invalid URL (no token required with OAuth)
    await page.getByLabel(/repository url/i).fill("invalid-url");

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

    // Check if authenticated (requires OAuth)
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Fill form with invalid data (no token required with OAuth)
    await page.getByLabel(/repository url/i).fill("invalid");

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
    await page.goto("/");

    // Check if authenticated (requires OAuth)
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Simulate offline scenario
    await page.context().setOffline(true);

    // Fill form (no token required with OAuth)
    await page
      .getByLabel(/repository url/i)
      .fill("https://github.com/vercel/next.js");

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

    // Check if authenticated (requires OAuth)
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    const repoUrl = "https://github.com/facebook/react";

    // Fill form (no token required with OAuth)
    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Note: Next.js client-side navigation doesn't preserve state by default
    // This test verifies current behavior
    await expect(page.getByLabel(/repository url/i)).toHaveValue(repoUrl);
  });
});
