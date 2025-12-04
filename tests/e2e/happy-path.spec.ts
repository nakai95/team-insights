import { test, expect } from "@playwright/test";

/**
 * E2E Happy Path Test
 * Tests the complete successful flow of analyzing a repository
 */

test.describe("Repository Analysis - Happy Path", () => {
  test("should complete full analysis workflow successfully", async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto("/");

    // Verify page loaded
    await expect(
      page.getByRole("heading", { name: "Team Insights" }),
    ).toBeVisible();

    // Fill in the form
    const repoUrl =
      process.env.TEST_REPO_URL || "https://github.com/vercel/next.js";
    const githubToken = process.env.TEST_GITHUB_TOKEN || "test_token";

    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByLabel(/github personal access token/i).fill(githubToken);

    // Optional: Fill in date range
    // await page.getByLabel(/start date/i).fill("2024-01-01");
    // await page.getByLabel(/end date/i).fill("2024-12-31");

    // Submit the form
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Verify loading state
    await expect(page.getByText(/analysis in progress/i)).toBeVisible();
    await expect(page.getByText(/analyzing repository/i)).toBeVisible();

    // Wait for analysis to complete (with generous timeout)
    // Note: In real tests, you'd mock the Server Action
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify dashboard components are displayed
    await expect(page.getByText(/total contributors/i)).toBeVisible();
    await expect(page.getByText(/total commits/i)).toBeVisible();
    await expect(page.getByText(/pull requests/i)).toBeVisible();
    await expect(page.getByText(/review comments/i)).toBeVisible();

    // Verify contributor list is displayed
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /rank/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /contributor/i }),
    ).toBeVisible();

    // Verify chart is displayed
    await expect(page.getByText(/implementation activity/i)).toBeVisible();

    // Test "Analyze Another Repository" button
    await page
      .getByRole("button", { name: /analyze another repository/i })
      .click();

    // Should return to form
    await expect(page.getByLabel(/repository url/i)).toBeVisible();
  });

  test("should handle date range input correctly", async ({ page }) => {
    await page.goto("/");

    const repoUrl = "https://github.com/facebook/react";
    const githubToken = process.env.TEST_GITHUB_TOKEN || "test_token";

    // Fill form with date range
    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByLabel(/github personal access token/i).fill(githubToken);
    await page.getByLabel(/start date/i).fill("2024-01-01");
    await page.getByLabel(/end date/i).fill("2024-06-30");

    // Verify dates are filled
    await expect(page.getByLabel(/start date/i)).toHaveValue("2024-01-01");
    await expect(page.getByLabel(/end date/i)).toHaveValue("2024-06-30");

    // Submit
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Verify loading state
    await expect(page.getByText(/analysis in progress/i)).toBeVisible();
  });

  test("should display form validation", async ({ page }) => {
    await page.goto("/");

    // Try to submit without filling required fields
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Browser native validation should prevent submission
    // The form should still be visible
    await expect(page.getByLabel(/repository url/i)).toBeVisible();
  });
});
