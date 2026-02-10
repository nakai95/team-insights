import { test, expect } from "@playwright/test";

/**
 * E2E Progressive Loading Test
 * Tests the progressive loading feature with Enable Fast Loading button,
 * date range changes, and cache behavior
 */

test.describe("Progressive Loading Dashboard", () => {
  test("should enable progressive mode and load historical data", async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto("/");

    // Check if authenticated (requires OAuth)
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Fill in the form with test repository
    const repoUrl =
      process.env.TEST_REPO_URL || "https://github.com/vercel/next.js";
    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Submit the form (starts in full/legacy mode)
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for initial analysis to complete
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify we're in legacy mode (no progressive badge yet)
    const progressiveBadge = page.getByText(/progressive loading active/i);
    await expect(progressiveBadge).not.toBeVisible();

    // Click "Enable Fast Loading" button
    const enableButton = page.getByRole("button", {
      name: /enable fast loading/i,
    });
    await expect(enableButton).toBeVisible();
    await enableButton.click();

    // Verify URL changed to progressive mode
    await page.waitForURL(/[?&]mode=progressive/);

    // Verify progressive mode badge is now visible
    await expect(progressiveBadge).toBeVisible();

    // Verify Enable Fast Loading button is now hidden
    await expect(enableButton).not.toBeVisible();

    // Check for loading indicator during background data fetch
    // Note: This might complete quickly if data is cached
    const loadingIndicator = page.getByText(/loading/i);
    // Loading might be visible or already complete
    const isLoading = await loadingIndicator.isVisible().catch(() => false);

    if (isLoading) {
      // Wait for loading to complete
      await expect(loadingIndicator).not.toBeVisible({ timeout: 30000 });
    }

    // Verify success indicator appears
    const successIndicator = page.getByText(/loaded.*pull requests/i);
    await expect(successIndicator).toBeVisible({ timeout: 30000 });
  });

  test("should change date range in progressive mode", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Check if authenticated
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Fill in the form
    const repoUrl = "https://github.com/facebook/react";
    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Submit and wait for analysis
    await page.getByRole("button", { name: /analyze repository/i }).click();
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Enable progressive mode
    const enableButton = page.getByRole("button", {
      name: /enable fast loading/i,
    });
    await enableButton.click();
    await page.waitForURL(/[?&]mode=progressive/);

    // Wait for initial progressive load to complete
    await expect(page.getByText(/progressive loading active/i)).toBeVisible();

    // Verify DateRangeSelector is visible
    const dateRangeLabel = page.getByText(/date range/i).first();
    await expect(dateRangeLabel).toBeVisible();

    // Click on date range preset (e.g., "Last 7 Days")
    const last7DaysButton = page.getByRole("button", { name: /7 days/i });
    if (await last7DaysButton.isVisible()) {
      await last7DaysButton.click();

      // Verify URL updated with new date range
      await page.waitForURL(/[?&]range=7d/);

      // Verify loading indicator appears for new date range
      const loadingIndicator = page.getByText(/loading/i);
      const isLoading = await loadingIndicator.isVisible().catch(() => false);

      if (isLoading) {
        // Wait for loading to complete
        await expect(loadingIndicator).not.toBeVisible({ timeout: 30000 });
      }

      // Verify data loaded successfully
      const successIndicator = page.getByText(/loaded.*pull requests/i);
      await expect(successIndicator).toBeVisible({ timeout: 30000 });
    }
  });

  test("should switch between tabs in progressive mode", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Check if authenticated
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Fill in the form
    const repoUrl =
      process.env.TEST_REPO_URL || "https://github.com/vercel/next.js";
    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Submit and wait for analysis
    await page.getByRole("button", { name: /analyze repository/i }).click();
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Enable progressive mode
    const enableButton = page.getByRole("button", {
      name: /enable fast loading/i,
    });
    await enableButton.click();
    await page.waitForURL(/[?&]mode=progressive/);

    // Wait for progressive mode to be active
    await expect(page.getByText(/progressive loading active/i)).toBeVisible();

    // Click on "PR Throughput" tab
    const throughputTab = page.getByRole("button", {
      name: /pr throughput/i,
    });
    if (await throughputTab.isVisible()) {
      await throughputTab.click();

      // Verify URL updated with tab parameter
      await page.waitForURL(/[?&]tab=throughput/);

      // Verify progressive mode is still active
      await expect(page.getByText(/progressive loading active/i)).toBeVisible();
    }

    // Click on "PR Changes" tab
    const changesTab = page.getByRole("button", { name: /pr changes/i });
    if (await changesTab.isVisible()) {
      await changesTab.click();

      // Verify URL updated
      await page.waitForURL(/[?&]tab=changes/);

      // Verify progressive mode is still active
      await expect(page.getByText(/progressive loading active/i)).toBeVisible();
    }

    // Click on "Deployment Frequency" tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    if (await deploymentTab.isVisible()) {
      await deploymentTab.click();

      // Verify URL updated
      await page.waitForURL(/[?&]tab=deployment-frequency/);

      // Verify progressive mode is still active (Phase 4 active message)
      const progressiveIndicator = page.getByText(
        /progressive loading active|phase 4.*active/i,
      );
      await expect(progressiveIndicator).toBeVisible();
    }
  });

  test("should preserve progressive mode on page refresh", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Check if authenticated
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    if (!isAuthenticated) {
      test.skip();
      return;
    }

    // Fill in the form
    const repoUrl = "https://github.com/facebook/react";
    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Submit and wait for analysis
    await page.getByRole("button", { name: /analyze repository/i }).click();
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Enable progressive mode
    const enableButton = page.getByRole("button", {
      name: /enable fast loading/i,
    });
    await enableButton.click();
    await page.waitForURL(/[?&]mode=progressive/);

    // Wait for progressive mode to be active
    await expect(page.getByText(/progressive loading active/i)).toBeVisible();

    // Get current URL
    const currentUrl = page.url();

    // Refresh the page
    await page.reload();

    // Verify URL still has mode=progressive
    expect(page.url()).toContain("mode=progressive");

    // Verify progressive mode is still active after refresh
    await expect(page.getByText(/progressive loading active/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify Enable Fast Loading button is not visible (still in progressive mode)
    await expect(
      page.getByRole("button", { name: /enable fast loading/i }),
    ).not.toBeVisible();
  });
});
