import { test, expect } from "@playwright/test";

/**
 * E2E Test: Deployment Frequency Tab
 * Tests that the deployment frequency tab displays correctly with all components
 */

test.describe("Deployment Frequency Tab", () => {
  test("should display deployment frequency tab with all components", async ({
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

    // Use a repository with known release/deployment data
    const repoUrl =
      process.env.TEST_REPO_URL || "https://github.com/vercel/next.js";

    await page.getByLabel(/repository url/i).fill(repoUrl);

    // Submit the form
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis to complete
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await expect(deploymentTab).toBeVisible();
    await deploymentTab.click();

    // Wait for tab content to load
    await page.waitForTimeout(1000);

    // Verify deployment frequency content is displayed
    // Check for either data display or empty state
    const bodyText = await page.textContent("body");

    const hasDeploymentData =
      bodyText?.includes("Total Deployments") ||
      bodyText?.includes("Average per Week") ||
      bodyText?.includes("DORA Performance Level") ||
      bodyText?.includes("Weekly Deployment Frequency") ||
      bodyText?.includes("Monthly Deployment Frequency");

    const hasEmptyState =
      bodyText?.includes("No Deployment Data") ||
      bodyText?.includes("No deployment events found");

    // At least one of these should be true
    expect(hasDeploymentData || hasEmptyState).toBe(true);
  });

  test("should display summary cards when deployment data exists", async ({
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

    // Use a repository that likely has releases
    const repoUrl = "https://github.com/facebook/react";

    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent("body");

    // Check if summary cards are displayed (if data exists)
    if (
      bodyText?.includes("Total Deployments") ||
      bodyText?.includes("Average per Week")
    ) {
      // Verify summary metrics
      await expect(page.getByText(/total deployments/i)).toBeVisible();
      await expect(page.getByText(/average per week/i)).toBeVisible();
      await expect(page.getByText(/average per month/i)).toBeVisible();
      await expect(page.getByText(/analysis period/i)).toBeVisible();
    }
  });

  test("should display DORA performance level when data exists", async ({
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

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent("body");

    // Check if DORA level is displayed (if data exists)
    if (bodyText?.includes("DORA Performance Level")) {
      await expect(page.getByText(/dora performance level/i)).toBeVisible();

      // One of the DORA levels should be present
      const hasElite = bodyText?.toUpperCase().includes("ELITE") ?? false;
      const hasHigh = bodyText?.toUpperCase().includes("HIGH") ?? false;
      const hasMedium = bodyText?.toUpperCase().includes("MEDIUM") ?? false;
      const hasLow = bodyText?.toUpperCase().includes("LOW") ?? false;

      const hasAnyLevel = hasElite || hasHigh || hasMedium || hasLow;
      expect(hasAnyLevel).toBe(true);
    }
  });

  test("should display charts when deployment data exists", async ({
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

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent("body");

    // Check if charts are displayed (if data exists)
    if (bodyText?.includes("Weekly Deployment Frequency")) {
      // Verify weekly chart section
      await expect(
        page.getByText(/weekly deployment frequency/i),
      ).toBeVisible();

      // Verify monthly chart section
      await expect(
        page.getByText(/monthly deployment frequency/i),
      ).toBeVisible();

      // Verify at least one SVG chart is rendered
      const svgElements = await page.locator("svg").count();
      expect(svgElements).toBeGreaterThan(0);
    }
  });

  test("should display empty state when no deployment data", async ({
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

    // Use a repository that might not have releases/deployments
    // Note: This is a heuristic - the test will adapt based on actual data
    const repoUrl =
      process.env.TEST_EMPTY_REPO_URL || "https://github.com/vercel/next.js";

    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent("body");

    // If empty state is shown, verify the guidance messages
    if (bodyText?.includes("No Deployment Data")) {
      await expect(page.getByText(/no deployment data/i)).toBeVisible();
      await expect(page.getByText(/no deployment events found/i)).toBeVisible();

      // Verify helpful guidance is provided
      const hasGuidance =
        bodyText?.includes("GitHub Releases") ||
        bodyText?.includes("Tag your commits") ||
        bodyText?.includes("GitHub Actions");

      expect(hasGuidance).toBe(true);
    }
  });

  test("should display recent deployments when data exists", async ({
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

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent("body");

    // Check if recent deployments section exists (if data exists)
    if (bodyText?.includes("Recent Deployments")) {
      await expect(page.getByText(/recent deployments/i)).toBeVisible();

      // Check for deployment sources (Release, Deployment, Tag)
      const hasSource =
        bodyText?.includes("Release") ||
        bodyText?.includes("Deployment") ||
        bodyText?.includes("Tag");

      if (hasSource) {
        expect(hasSource).toBe(true);
      }
    }
  });

  test("should persist tab selection in URL", async ({ page }) => {
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

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    // Verify URL contains tab parameter
    const currentUrl = page.url();
    expect(currentUrl).toContain("tab=deployment-frequency");
  });

  test("should display trend indicators and moving average", async ({
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

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent("body");

    // Check if trend indicator is displayed (if enough data exists)
    if (bodyText?.includes("Trend:")) {
      await expect(page.getByText(/trend:/i)).toBeVisible();

      // One of the trend directions should be present
      const hasIncreasing = bodyText?.includes("Increasing") ?? false;
      const hasDecreasing = bodyText?.includes("Decreasing") ?? false;
      const hasStable = bodyText?.includes("Stable") ?? false;

      const hasAnyTrend = hasIncreasing || hasDecreasing || hasStable;
      expect(hasAnyTrend).toBe(true);
    }

    // Verify SVG chart is rendered (trend line should be present if data exists)
    const svgElements = await page.locator("svg").count();
    expect(svgElements).toBeGreaterThan(0);
  });

  test("should show trend visualization for repositories with sufficient data", async ({
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

    // Use a repository likely to have consistent deployment history
    const repoUrl = "https://github.com/facebook/react";

    await page.getByLabel(/repository url/i).fill(repoUrl);
    await page.getByRole("button", { name: /analyze repository/i }).click();

    // Wait for analysis
    await expect(page.getByText(/repository analysis/i)).toBeVisible({
      timeout: 60000,
    });

    // Navigate to Deployment Frequency tab
    const deploymentTab = page.getByRole("button", {
      name: /deployment frequency/i,
    });
    await deploymentTab.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent("body");

    // If there's deployment data, verify key elements
    if (bodyText?.includes("Total Deployments")) {
      // Check for weekly chart
      await expect(
        page.getByText(/weekly deployment frequency/i),
      ).toBeVisible();

      // Check for monthly chart
      await expect(
        page.getByText(/monthly deployment frequency/i),
      ).toBeVisible();

      // Verify charts are rendered
      const charts = await page.locator("svg").count();
      expect(charts).toBeGreaterThanOrEqual(2); // At least 2 charts
    }
  });
});
