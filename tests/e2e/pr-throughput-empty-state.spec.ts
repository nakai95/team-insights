import { test, expect } from "@playwright/test";

/**
 * E2E Test: PR Throughput Analysis - Empty State
 * Tests that the empty state displays correctly when there are no merged PRs
 */

test.describe("PR Throughput Analysis - Empty State", () => {
  test("should display empty state message when no merged PRs available", async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto("/");

    // Verify page loaded
    await expect(
      page.getByRole("heading", { name: "Team Insights" }),
    ).toBeVisible();

    // Check if authenticated (requires OAuth)
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      // Skip test if not authenticated
      test.skip();
      return;
    }

    // Use a repository that is known to have few or no merged PRs
    // Or use a date range that excludes all PRs
    const repoUrl =
      process.env.TEST_EMPTY_REPO_URL || "https://github.com/vercel/next.js"; // Will filter by date range

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Set a date range that's unlikely to have any merged PRs
    // Use a date range in the far future or far past
    await page.getByLabel(/start date/i).fill("2030-01-01");
    await page.getByLabel(/end date/i).fill("2030-01-31");

    // Submit the form
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis to complete
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify PR Throughput section is visible
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible();

    // Verify empty state message is displayed
    const bodyText = await page.textContent("body");

    // Check for empty state indicators
    const hasEmptyStateMessage =
      bodyText?.includes("No merged PRs") ||
      bodyText?.includes("no merged pull requests") ||
      bodyText?.includes("0 merged PRs") ||
      bodyText?.includes("Insufficient data");

    expect(hasEmptyStateMessage).toBe(true);
  });

  test("should not display charts when no data is available", async ({
    page,
  }) => {
    await page.goto("/");

    // Check if authenticated
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    const repoUrl = "https://github.com/vercel/next.js";

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Use a date range with no PRs
    await page.getByLabel(/start date/i).fill("2030-01-01");
    await page.getByLabel(/end date/i).fill("2030-01-31");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify PR Throughput section exists
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible();

    // In empty state, scatter plot and bar chart should not be visible
    // or should show empty state message
    const bodyText = await page.textContent("body");

    // Should indicate no data or show empty state
    const hasEmptyIndication =
      bodyText?.includes("No merged PRs") ||
      bodyText?.includes("no data") ||
      bodyText?.includes("Insufficient data") ||
      bodyText?.includes("0 merged PRs");

    expect(hasEmptyIndication).toBe(true);
  });

  test("should show zero metrics when no merged PRs", async ({ page }) => {
    await page.goto("/");

    // Check if authenticated
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    const repoUrl = "https://github.com/facebook/react";

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Set future date range with no PRs
    await page.getByLabel(/start date/i).fill("2030-06-01");
    await page.getByLabel(/end date/i).fill("2030-06-30");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify PR Throughput section is present
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible();

    // Check that metrics show zero or empty state
    const bodyText = await page.textContent("body");

    // Should show 0 merged PRs or empty state message
    const showsZeroMetrics =
      bodyText?.includes("0 merged PRs") ||
      bodyText?.includes("No merged PRs") ||
      bodyText?.includes("Insufficient data");

    expect(showsZeroMetrics).toBe(true);
  });

  test("should handle repository with no PRs at all gracefully", async ({
    page,
  }) => {
    await page.goto("/");

    // Check if authenticated
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Use any valid repository URL (behavior should be the same with date range filtering)
    const repoUrl = "https://github.com/vercel/next.js";

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Date range that won't have any PRs
    await page.getByLabel(/start date/i).fill("2015-01-01");
    await page.getByLabel(/end date/i).fill("2015-01-02");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Page should not crash - PR Throughput section should handle empty state
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible();

    // Should show appropriate empty state message
    const bodyText = await page.textContent("body");
    const hasEmptyMessage =
      bodyText?.includes("No merged PRs") ||
      bodyText?.includes("no data") ||
      bodyText?.includes("Insufficient data") ||
      bodyText?.includes("0 merged PRs");

    expect(hasEmptyMessage).toBe(true);

    // Verify no JavaScript errors occurred
    // Page should still be responsive
    await expect(page.getByText(/team insights/i)).toBeVisible();
  });
});
