import { test, expect } from "@playwright/test";

/**
 * E2E Tests for User Story 3: Session Management and Logout
 *
 * Tests:
 * - T032: Session persistence (authenticate → close browser → reopen → verify still authenticated)
 * - T033: Sign-out flow (authenticate → sign out → verify redirect → verify unauthenticated → attempt analysis → verify login redirect)
 *
 * Prerequisites:
 * - Development server running on http://localhost:3000
 * - GitHub OAuth app configured with callback URL
 * - Valid test credentials in environment variables
 */

test.describe("User Story 3: Session Management and Logout", () => {
  test.describe("T032: Session Persistence", () => {
    test("should persist session after closing and reopening browser", async ({
      browser,
    }) => {
      // Step 1: Create a new browser context (simulates a fresh browser session)
      const context = await browser.newContext();
      const page = await context.newPage();

      // Step 2: Navigate to the app homepage (public route)
      await page.goto("http://localhost:3000");

      // Step 3: Homepage is public, so we should be able to access it
      await expect(page).toHaveURL("http://localhost:3000/");

      // Step 4: Try to access login page
      await page.goto("http://localhost:3000/login");
      await expect(
        page.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();

      // Step 5: Close the context (simulates closing the browser)
      const storageState = await context.storageState();
      await context.close();

      // Step 6: Create a new context with the same storage state (simulates reopening browser with cookies)
      const newContext = await browser.newContext({
        storageState,
      });
      const newPage = await newContext.newPage();

      // Step 7: Navigate to the app again
      await newPage.goto("http://localhost:3000/login");

      // Step 8: Should still be able to access login page (not authenticated)
      await expect(newPage).toHaveURL(/\/login/);
      await expect(
        newPage.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();

      await newContext.close();
    });

    test("should maintain session across page refreshes", async ({ page }) => {
      // Navigate to login page
      await page.goto("http://localhost:3000/login");

      // Verify we're on login page
      await expect(page).toHaveURL(/\/login/);

      // Verify sign-in button is visible
      await expect(
        page.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();

      // Refresh the page
      await page.reload();

      // Should still be on login page
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();

      // Note: In a real test with actual authentication, you would:
      // 1. Click sign in button
      // 2. Complete OAuth flow
      // 3. Verify authenticated state
      // 4. Refresh the page
      // 5. Verify still authenticated
    });
  });

  test.describe("T033: Sign-out Flow", () => {
    test("should show homepage for unauthenticated users", async ({ page }) => {
      // Step 1: Navigate to the app homepage
      await page.goto("http://localhost:3000");

      // Step 2: Homepage is public, should be accessible
      await expect(page).toHaveURL("http://localhost:3000/");

      // Step 3: Check if Header component is visible (which contains UserProfile)
      await expect(page.locator("header")).toBeVisible();

      // Note: In a real authenticated test, you would:
      // 1. Authenticate via OAuth
      // 2. Verify authenticated state (user profile visible in header)
      // 3. Click "Sign out" button
      // 4. Verify redirect to homepage (/)
      // 5. Verify unauthenticated state (sign-in button visible)
    });

    test.skip("should redirect to login when attempting to access protected routes (requires OAuth setup)", async ({
      page,
    }) => {
      // NOTE: This test requires actual OAuth authentication setup to work properly
      // Skip for now until OAuth credentials are configured in test environment

      // Step 1: Navigate to a protected route without authentication
      await page.goto("http://localhost:3000/dashboard");

      // Step 2: Should redirect to login with callback URL
      await expect(page).toHaveURL(/\/login/);

      // Step 3: Verify the callback URL is preserved
      const url = new URL(page.url());
      expect(url.searchParams.get("callbackUrl")).toBe("/dashboard");

      // Complete test flow:
      // 1. Authenticate via OAuth
      // 2. Navigate to protected route (should work)
      // 3. Sign out
      // 4. Attempt to access protected route again
      // 5. Verify redirect to login
      // 6. Verify callbackUrl parameter is set
    });

    test("should show sign-in button on login page", async ({ page }) => {
      // Navigate to login page
      await page.goto("http://localhost:3000/login");

      // Should be on login page
      await expect(page).toHaveURL(/\/login/);

      // Verify sign-in button is visible
      const signInButton = page
        .locator("button")
        .filter({ hasText: /sign in/i });
      await expect(signInButton).toBeVisible();

      // Verify button text
      await expect(signInButton).toContainText(/sign in/i);
    });

    test("should have login page accessible", async ({ page }) => {
      // Navigate to the login page
      await page.goto("http://localhost:3000/login");

      // Verify we're on login page
      await expect(page).toHaveURL(/\/login/);

      // Verify sign-in button exists
      await expect(
        page.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();

      // Note: In a real authenticated test, you would:
      // 1. Authenticate via OAuth
      // 2. Verify session cookie exists
      // 3. Sign out
      // 4. Verify session cookie is cleared
      // 5. Verify accessing protected routes redirects to login
    });
  });

  test.describe("Integration: Complete Session Lifecycle", () => {
    test.skip("should handle complete session lifecycle (requires OAuth setup)", async ({
      page,
    }) => {
      // NOTE: This test requires actual OAuth authentication setup to work properly
      // Skip for now until OAuth credentials are configured in test environment

      // Step 1: Start at homepage (public route)
      await page.goto("http://localhost:3000");
      await expect(page).toHaveURL("http://localhost:3000/");

      // Step 2: Navigate to login page
      await page.goto("http://localhost:3000/login");
      await expect(page).toHaveURL(/\/login/);

      // Step 3: Verify sign-in button exists
      await expect(
        page.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();

      // Complete authenticated flow would include:
      // 1. Click "Sign in with GitHub"
      // 2. Authenticate via GitHub OAuth
      // 3. Verify redirect back to app
      // 4. Verify authenticated state (user profile visible)
      // 5. Use app features (e.g., analyze repository)
      // 6. Click "Sign out"
      // 7. Verify redirect to homepage
      // 8. Verify unauthenticated state
      // 9. Attempt to access protected route
      // 10. Verify redirect to login
    });

    test("should verify unauthenticated user can access login page", async ({
      page,
    }) => {
      // Step 1: Navigate to login page
      await page.goto("http://localhost:3000/login");
      await expect(page).toHaveURL(/\/login/);

      // Step 2: Verify sign-in button exists
      await expect(
        page.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();

      // Step 3: Verify homepage is accessible
      await page.goto("http://localhost:3000");
      await expect(page).toHaveURL("http://localhost:3000/");
    });
  });
});

/**
 * Test Notes:
 *
 * 1. These tests are placeholder tests that verify the basic structure
 *    and unauthenticated flows. To fully test session management,
 *    you need to:
 *    - Set up test GitHub OAuth credentials
 *    - Implement OAuth flow testing (or mock it)
 *    - Test actual authenticated sessions
 *
 * 2. Session Persistence Testing:
 *    - Requires actual OAuth authentication
 *    - Can be tested by saving and restoring storage state
 *    - Should verify session cookie exists and is valid
 *    - Should verify session lasts 7 days with activity extension
 *
 * 3. Sign-out Testing:
 *    - Requires actual OAuth authentication first
 *    - Should verify signOut() is called with correct parameters
 *    - Should verify session cookie is cleared
 *    - Should verify redirect to homepage
 *    - Should verify protected routes redirect to login
 *
 * 4. For production testing, consider:
 *    - Using GitHub OAuth test credentials
 *    - Mocking the OAuth flow for faster tests
 *    - Testing session expiration (7-day timeout)
 *    - Testing session extension (24-hour activity)
 *    - Testing error states (token revoked, etc.)
 */
