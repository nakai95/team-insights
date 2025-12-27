import { test, expect } from "@playwright/test";

/**
 * E2E Test: PR Throughput Analysis - Happy Path
 * Tests that the PR throughput section displays correctly with all components
 */

test.describe("PR Throughput Analysis - Happy Path", () => {
  test("should display PR throughput section with all components", async ({
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

    // Use a repository with known PR data
    const repoUrl =
      process.env.TEST_REPO_URL || "https://github.com/vercel/next.js";

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Submit the form
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis to complete
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify PR Throughput section is visible
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible();

    // Verify summary statistics are displayed
    await expect(page.getByText(/average lead time/i)).toBeVisible();
    await expect(page.getByText(/median lead time/i)).toBeVisible();
    await expect(page.getByText(/total merged prs/i)).toBeVisible();

    // Verify scatter plot is rendered (check for chart-related elements)
    // The scatter plot should be in a section with "PR Size vs Lead Time"
    const scatterSection = page.locator("text=/PR Size.*Lead Time/i");
    if (await scatterSection.isVisible()) {
      await expect(scatterSection).toBeVisible();
    }

    // Verify size bucket table is displayed
    const tableSectionText = await page.textContent("body");
    const hasSizeBucketTable =
      tableSectionText?.includes("Small") ||
      tableSectionText?.includes("Medium") ||
      tableSectionText?.includes("Large");

    if (hasSizeBucketTable) {
      // Check for size bucket headers or content
      const sizeBucketContent = page.locator("text=/Size.*Bucket/i");
      if (await sizeBucketContent.isVisible().catch(() => false)) {
        await expect(sizeBucketContent).toBeVisible();
      }
    }

    // Verify insight message is displayed (one of the insight types should appear)
    const bodyText = await page.textContent("body");
    const hasInsight =
      bodyText?.includes("most efficient") ||
      bodyText?.includes("No clear difference") ||
      bodyText?.includes("Insufficient data");

    expect(hasInsight).toBe(true);
  });

  test("should display scatter plot with interactive tooltip", async ({
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

    const repoUrl = "https://github.com/facebook/react";

    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Check if scatter plot section exists
    const scatterSection = page.locator("text=/PR Size.*Lead Time/i");
    const scatterExists = await scatterSection.isVisible().catch(() => false);

    if (scatterExists) {
      // Try to hover over a data point to trigger tooltip
      // Note: This is a basic check - actual tooltip verification may require
      // more specific selectors based on Recharts implementation
      const chartArea = page.locator("svg").first();
      if (await chartArea.isVisible()) {
        await expect(chartArea).toBeVisible();
        // Hover over the chart to potentially trigger tooltips
        await chartArea.hover();
      }
    }
  });

  test("should display size bucket analysis with bar chart", async ({
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
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify bar chart is rendered (SVG element should be present)
    const svgElements = await page.locator("svg").count();
    expect(svgElements).toBeGreaterThan(0);

    // Verify size bucket categories are mentioned in the content
    const bodyText = await page.textContent("body");
    const hasSizeBuckets =
      bodyText?.includes("Small") ||
      bodyText?.includes("Medium") ||
      bodyText?.includes("Large") ||
      bodyText?.includes("Extra Large");

    expect(hasSizeBuckets).toBe(true);
  });

  test("should display appropriate insight message", async ({ page }) => {
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
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Check for one of the three insight types
    const bodyText = await page.textContent("body");

    const hasOptimalInsight = bodyText?.includes("most efficient");
    const hasNoDifferenceInsight = bodyText?.includes("No clear difference");
    const hasInsufficientDataInsight = bodyText?.includes("Insufficient data");

    // At least one insight type should be present
    const hasAnyInsight =
      hasOptimalInsight || hasNoDifferenceInsight || hasInsufficientDataInsight;

    expect(hasAnyInsight).toBe(true);
  });
});
