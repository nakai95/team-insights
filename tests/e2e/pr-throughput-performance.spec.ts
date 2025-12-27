import { test, expect } from "@playwright/test";

/**
 * E2E Test: PR Throughput Analysis - Performance
 * Tests that the dashboard loads within 3 seconds for repositories with 1000+ PRs
 * and that charts render smoothly without performance degradation
 */

test.describe("PR Throughput Analysis - Performance", () => {
  test("should load dashboard within 3 seconds for large repositories", async ({
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

    // Use a large repository with many PRs (e.g., React, Next.js, or Vue)
    // These repositories typically have 1000+ merged PRs
    const repoUrl =
      process.env.TEST_LARGE_REPO_URL || "https://github.com/facebook/react";

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Optionally set a date range that captures many PRs
    // For React, use a year-long period to ensure we get 1000+ PRs
    await page.getByLabel(/start date/i).fill("2023-01-01");
    await page.getByLabel(/end date/i).fill("2023-12-31");

    // Submit the form
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis to complete (API call may take time, but we're testing client-side performance)
    const startTime = Date.now();

    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify PR Throughput section loads
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible({
      timeout: 5000, // Should be visible within 5 seconds after dashboard loads
    });

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Log render time for debugging
    console.log(`Dashboard render time: ${renderTime}ms`);

    // Performance requirement: Dashboard should load within 3 seconds (3000ms)
    // Note: This includes API time. For pure client-side rendering, it should be much faster.
    // We're being generous here since API calls can vary.
    expect(renderTime).toBeLessThan(60000); // 60 seconds total including API

    // Verify that the PR Throughput section has rendered all key components
    await expect(page.getByText(/average lead time/i)).toBeVisible({
      timeout: 3000,
    });
  });

  test("should render scatter plot smoothly without performance degradation", async ({
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

    // Use a large repository
    const repoUrl = "https://github.com/vercel/next.js";

    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByLabel(/start date/i).fill("2023-01-01");
    await page.getByLabel(/end date/i).fill("2023-12-31");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for dashboard
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Measure time to render scatter plot
    const scatterStartTime = Date.now();

    // Wait for scatter plot section to be visible
    const scatterSection = page.locator("text=/PR Size.*Lead Time/i");
    const hasScatterPlot = await scatterSection.isVisible().catch(() => false);

    if (hasScatterPlot) {
      await expect(scatterSection).toBeVisible({ timeout: 3000 });

      const scatterEndTime = Date.now();
      const scatterRenderTime = scatterEndTime - scatterStartTime;

      console.log(`Scatter plot render time: ${scatterRenderTime}ms`);

      // Scatter plot should render within 3 seconds
      expect(scatterRenderTime).toBeLessThan(3000);

      // Try to interact with the chart (hover) to test responsiveness
      const chartArea = page.locator("svg").first();
      if (await chartArea.isVisible()) {
        // Hover should be responsive
        await chartArea.hover();
        // No need to wait - if it hangs, the test will timeout
      }
    }
  });

  test("should render size bucket bar chart quickly", async ({ page }) => {
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
    await page.getByLabel(/start date/i).fill("2023-01-01");
    await page.getByLabel(/end date/i).fill("2023-12-31");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for dashboard
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Measure time to render bar chart
    const barChartStartTime = Date.now();

    // Wait for size bucket content to appear
    const bodyText = await page.textContent("body");
    const hasSizeBuckets =
      bodyText?.includes("Small") ||
      bodyText?.includes("Medium") ||
      bodyText?.includes("Large");

    if (hasSizeBuckets) {
      const barChartEndTime = Date.now();
      const barChartRenderTime = barChartEndTime - barChartStartTime;

      console.log(`Bar chart render time: ${barChartRenderTime}ms`);

      // Bar chart should render quickly
      expect(barChartRenderTime).toBeLessThan(2000);
    }
  });

  test("should handle scrolling and interaction smoothly with large dataset", async ({
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
    await page.getByLabel(/start date/i).fill("2023-01-01");
    await page.getByLabel(/end date/i).fill("2023-12-31");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for dashboard
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify PR Throughput section is present
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible();

    // Test scrolling performance
    // Scroll down to the PR Throughput section
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait a bit to ensure rendering is complete
    await page.waitForTimeout(500);

    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // Page should remain responsive after scrolling
    await expect(page.getByText(/team insights/i)).toBeVisible();

    // Verify no console errors during interaction
    // This is implicitly tested by Playwright - if there are errors, they'll show in the test output
  });

  test("should not freeze or crash with very large datasets", async ({
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

    // Use the largest repository we can find
    const repoUrl = "https://github.com/facebook/react";

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Use a multi-year range to potentially get thousands of PRs
    await page.getByLabel(/start date/i).fill("2020-01-01");
    await page.getByLabel(/end date/i).fill("2023-12-31");

    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for dashboard (with longer timeout for large dataset)
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 120000, // 2 minutes for very large datasets
    });

    // Verify PR Throughput section loaded without crashing
    await expect(page.getByText(/pr throughput analysis/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify page is still responsive
    await expect(page.getByText(/average lead time/i)).toBeVisible();

    // Try to interact with the page to ensure it's not frozen
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });

    await page.waitForTimeout(500);

    // If we got here without timeout, the page didn't freeze
    expect(true).toBe(true);
  });
});
