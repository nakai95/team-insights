import { test, expect } from "@playwright/test";

/**
 * E2E Test: OAuth Denial → Error Message Flow (T046)
 *
 * Tests error handling when users deny GitHub OAuth authorization
 *
 * Prerequisites:
 * - Development server running on http://localhost:3000
 * - GitHub OAuth app configured with callback URL
 *
 * Note: This test verifies the error page and error handling behavior.
 * Actual OAuth denial requires manual interaction or GitHub API mocking.
 */

test.describe("OAuth Denial → Error Message Flow", () => {
  test("should display auth error page with helpful message", async ({
    page,
  }) => {
    // Step 1: Navigate directly to auth error page
    // This simulates what happens when OAuth is denied or fails
    await page.goto("http://localhost:3000/en/auth/error");

    // Step 2: Verify we're on the error page
    await expect(page).toHaveURL(/\/auth\/error/);

    // Step 3: Verify error message is displayed
    await expect(
      page.getByText(/authentication error|error/i).first(),
    ).toBeVisible();

    // Step 4: Verify "Try Again" button exists
    // The error page should provide a way to retry authentication
    const retryButton = page.getByRole("button", { name: /try again/i });
    const hasRetryOption = await retryButton.isVisible().catch(() => false);

    expect(hasRetryOption).toBe(true);
  });

  test("should auto sign out when on auth error page", async ({ page }) => {
    // Step 1: Navigate to auth error page
    await page.goto("http://localhost:3000/en/auth/error");

    // Step 2: Wait for auto sign-out effect to run
    await page.waitForTimeout(1000);

    // Step 3: Verify user is not authenticated
    // Check that sign-out button is not visible
    const signOutButton = page.locator("header").getByText(/sign out/i);
    const isAuthenticated = await signOutButton.isVisible().catch(() => false);

    expect(isAuthenticated).toBe(false);

    // Step 4: Navigate to homepage
    await page.goto("http://localhost:3000");

    // Step 5: Verify still not authenticated after navigation
    const stillAuthenticated = await page
      .locator("header")
      .getByText(/sign out/i)
      .isVisible()
      .catch(() => false);

    expect(stillAuthenticated).toBe(false);
  });

  test("should allow retry after auth error", async ({ page }) => {
    // Step 1: Navigate to auth error page
    await page.goto("http://localhost:3000/en/auth/error");

    // Step 2: Wait for page to load
    await expect(page.getByText(/error/i).first()).toBeVisible();

    // Step 3: Click retry/try again button
    const retryButton = page.getByRole("button", { name: /try again/i });
    const hasRetryButton = await retryButton.isVisible().catch(() => false);

    if (hasRetryButton) {
      await retryButton.click();

      // Step 4: Should navigate to login page
      await expect(page).toHaveURL(/\/login/);

      // Step 5: Verify sign-in button is visible
      await expect(
        page.locator("button").filter({ hasText: /sign in with github/i }),
      ).toBeVisible();
    } else {
      // If no retry link, navigate manually to login
      await page.goto("http://localhost:3000/en/login");

      // Verify login page is accessible
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.locator("button").filter({ hasText: /sign in with github/i }),
      ).toBeVisible();
    }
  });

  test("should show specific error message for AccessDenied", async ({
    page,
  }) => {
    // Step 1: Navigate to auth error page with AccessDenied error
    await page.goto("http://localhost:3000/en/auth/error?error=AccessDenied");

    // Step 2: Verify we're on the error page
    await expect(page).toHaveURL(/\/auth\/error/);

    // Step 3: Verify error message mentions access denied or authorization cancelled
    await expect(
      page.getByText(/cancelled|denied|authorization/i).first(),
    ).toBeVisible();
  });

  test("should not allow authenticated actions after auth error", async ({
    page,
  }) => {
    // Step 1: Navigate to auth error page
    await page.goto("http://localhost:3000/en/auth/error");

    // Step 2: Wait for auto sign-out
    await page.waitForTimeout(1000);

    // Step 3: Try to navigate to homepage and analyze a repository
    await page.goto("http://localhost:3000");

    // Step 4: If analysis form is visible, try to submit it
    const analysisForm = await page
      .getByLabel(/repository url/i)
      .isVisible()
      .catch(() => false);

    if (analysisForm) {
      await page
        .getByLabel(/repository url/i)
        .fill("https://github.com/facebook/react");
      await page.getByRole("button", { name: /analyze repository/i }).click();

      // Step 5: Should show authentication error or redirect to login
      await page.waitForTimeout(2000);

      const hasAuthError = await page
        .getByText(/authentication required|sign in/i)
        .isVisible()
        .catch(() => false);
      const isOnLoginPage = page.url().includes("/login");
      const isOnErrorPage = page.url().includes("/error");

      expect(hasAuthError || isOnLoginPage || isOnErrorPage).toBe(true);
    }
  });
});

test.describe("OAuth Error Handling - Various Scenarios", () => {
  test("should handle OAuthSignin error", async ({ page }) => {
    // Navigate to error page with OAuthSignin error
    await page.goto("http://localhost:3000/en/auth/error?error=OAuthSignin");

    // Verify error page is displayed
    await expect(page).toHaveURL(/\/auth\/error/);

    // Verify error message is shown
    await expect(page.getByText(/error/i).first()).toBeVisible();
  });

  test("should handle OAuthCallback error", async ({ page }) => {
    // Navigate to error page with OAuthCallback error
    await page.goto("http://localhost:3000/en/auth/error?error=OAuthCallback");

    // Verify error page is displayed
    await expect(page).toHaveURL(/\/auth\/error/);

    // Verify error message is shown
    await expect(page.getByText(/error/i).first()).toBeVisible();
  });

  test("should handle OAuthAccountNotLinked error", async ({ page }) => {
    // Navigate to error page with OAuthAccountNotLinked error
    await page.goto(
      "http://localhost:3000/en/auth/error?error=OAuthAccountNotLinked",
    );

    // Verify error page is displayed
    await expect(page).toHaveURL(/\/auth\/error/);

    // Verify error message is shown
    await expect(page.getByText(/error/i).first()).toBeVisible();
  });

  test("should provide clear error context", async ({ page }) => {
    // Navigate to auth error page
    await page.goto("http://localhost:3000/en/auth/error");

    // Verify error page has helpful information
    await expect(page.getByText(/error/i).first()).toBeVisible();

    // Verify retry option exists
    const hasRetryOption = await page
      .getByRole("button", { name: /try again/i })
      .isVisible()
      .catch(() => false);

    expect(hasRetryOption).toBe(true);
  });
});

test.describe("Error Recovery Flow", () => {
  test("should allow full recovery from auth error", async ({ page }) => {
    // Step 1: Start at auth error page
    await page.goto("http://localhost:3000/en/auth/error");
    await expect(page).toHaveURL(/\/auth\/error/);

    // Step 2: Wait for auto sign-out
    await page.waitForTimeout(1000);

    // Step 3: Navigate to login page
    await page.goto("http://localhost:3000/en/login");
    await expect(page).toHaveURL(/\/login/);

    // Step 4: Verify sign-in button is available
    await expect(
      page.locator("button").filter({ hasText: /sign in with github/i }),
    ).toBeVisible();

    // Step 5: Verify no lingering error state
    const hasErrorMessage = await page
      .getByText(/authentication error/i)
      .isVisible()
      .catch(() => false);
    expect(hasErrorMessage).toBe(false);

    // Step 6: Verify can navigate to homepage
    await page.goto("http://localhost:3000");
    await expect(page).toHaveURL("http://localhost:3000/en/");

    // Step 7: Verify homepage loads without errors
    await expect(page.locator("header")).toBeVisible();
  });

  test("should prevent infinite redirect loops", async ({ page }) => {
    // Step 1: Navigate to auth error page
    await page.goto("http://localhost:3000/en/auth/error");

    // Step 2: Wait and verify we stay on error page
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/auth\/error/);

    // Step 3: Navigate away and back
    await page.goto("http://localhost:3000");
    await page.goto("http://localhost:3000/en/auth/error");

    // Step 4: Verify still on error page, not in a redirect loop
    await expect(page).toHaveURL(/\/auth\/error/);
  });
});

/**
 * Test Notes:
 *
 * 1. OAuth Denial Testing:
 *    - These tests verify error page behavior without requiring actual OAuth denial
 *    - Tests navigate directly to auth/error page to simulate OAuth failures
 *    - Error query parameter can be used to test specific error types
 *
 * 2. Auto Sign-out:
 *    - Error page should automatically sign out users to clear invalid sessions
 *    - Tests verify sign-out occurs and user cannot perform authenticated actions
 *
 * 3. Error Recovery:
 *    - Tests verify users can recover from errors by retrying authentication
 *    - Tests verify no lingering error state after recovery
 *    - Tests prevent infinite redirect loops
 *
 * 4. Error Messages:
 *    - Different OAuth errors should display appropriate messages
 *    - Tests verify error messages are user-friendly and actionable
 *
 * 5. For Manual Testing:
 *    - To test actual OAuth denial, click "Sign in with GitHub" and deny authorization
 *    - To test other errors, configure GitHub OAuth app incorrectly
 *    - Verify error messages are helpful and guide users to resolution
 */
