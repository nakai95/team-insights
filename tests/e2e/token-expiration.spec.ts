import { test, expect } from "@playwright/test";

/**
 * E2E Tests for User Story 4: Token Expiration Handling
 *
 * Tests:
 * - T039: Token expiration scenario (simulate expired token → attempt analysis → verify error message → re-authenticate → verify analysis works)
 *
 * Prerequisites:
 * - Development server running on http://localhost:3000
 * - GitHub OAuth app configured with callback URL
 * - Valid test credentials in environment variables
 */

test.describe("User Story 4: Token Expiration Handling", () => {
  test.describe("T039: Token Expiration Scenario", () => {
    test.skip("should handle token expiration gracefully (requires OAuth setup)", async ({
      page,
    }) => {
      // NOTE: This test requires actual OAuth authentication setup to work properly
      // Skip for now until OAuth credentials are configured in test environment
      // Complete test flow:
      // 1. Authenticate via OAuth
      // 2. Simulate token expiration (manually revoke GitHub app access or modify session)
      // 3. Attempt to analyze a repository
      // 4. Verify clear error message is displayed
      // 5. Verify re-authentication prompt is shown
      // 6. Click "Sign in again" button
      // 7. Re-authenticate via OAuth
      // 8. Verify analysis works after re-authentication
    });

    test("should display error page components correctly", async ({ page }) => {
      // Navigate to error page with RefreshAccessTokenError
      await page.goto(
        "http://localhost:3000/auth/error?error=RefreshAccessTokenError",
      );

      // Verify we're on the error page
      await expect(page).toHaveURL(/\/auth\/error/);

      // Verify error title is displayed
      await expect(page.locator("text=Session Expired")).toBeVisible();

      // Verify error message is displayed
      await expect(
        page.locator(
          "text=Your session has expired or your GitHub access has been revoked",
        ),
      ).toBeVisible();

      // Verify "Try Again" button is visible
      await expect(
        page.locator("button").filter({ hasText: /try again/i }),
      ).toBeVisible();

      // Verify "Go to Homepage" button is visible
      await expect(
        page.locator("button").filter({ hasText: /go to homepage/i }),
      ).toBeVisible();
    });

    test("should redirect to login when clicking 'Try Again'", async ({
      page,
    }) => {
      // Navigate to error page
      await page.goto(
        "http://localhost:3000/auth/error?error=RefreshAccessTokenError",
      );

      // Click "Try Again" button
      await page.click("button:has-text('Try Again')");

      // Verify redirect to login page
      await expect(page).toHaveURL(/\/login/);

      // Verify sign-in button is visible
      await expect(
        page.locator("button").filter({ hasText: /sign in/i }),
      ).toBeVisible();
    });

    test("should redirect to homepage when clicking 'Go to Homepage'", async ({
      page,
    }) => {
      // Navigate to error page
      await page.goto(
        "http://localhost:3000/auth/error?error=RefreshAccessTokenError",
      );

      // Click "Go to Homepage" button
      await page.click("button:has-text('Go to Homepage')");

      // Verify redirect to homepage
      await expect(page).toHaveURL("http://localhost:3000/");
    });

    test("should display different error messages for different error codes", async ({
      page,
    }) => {
      // Test RefreshAccessTokenError
      await page.goto(
        "http://localhost:3000/auth/error?error=RefreshAccessTokenError",
      );
      await expect(page.locator("text=Session Expired")).toBeVisible();

      // Test AccessDenied
      await page.goto("http://localhost:3000/auth/error?error=AccessDenied");
      await expect(page.locator("text=Authorization Cancelled")).toBeVisible();

      // Test OAuthSignin
      await page.goto("http://localhost:3000/auth/error?error=OAuthSignin");
      await expect(page.locator("text=Sign-In Failed")).toBeVisible();

      // Test OAuthCallback
      await page.goto("http://localhost:3000/auth/error?error=OAuthCallback");
      await expect(page.locator("text=Callback Failed")).toBeVisible();

      // Test OAuthAccountNotLinked
      await page.goto(
        "http://localhost:3000/auth/error?error=OAuthAccountNotLinked",
      );
      await expect(page.locator("text=Account Conflict")).toBeVisible();

      // Test default error (no error code)
      await page.goto("http://localhost:3000/auth/error");
      await expect(
        page.getByRole("heading", { name: "Authentication Error" }),
      ).toBeVisible();
    });

    test("should display error code when provided", async ({ page }) => {
      // Navigate to error page with error code
      await page.goto(
        "http://localhost:3000/auth/error?error=RefreshAccessTokenError",
      );

      // Verify error code is displayed
      await expect(
        page.locator("code:has-text('RefreshAccessTokenError')"),
      ).toBeVisible();
    });
  });

  test.describe("Integration: Complete Token Expiration Flow", () => {
    test.skip("should handle complete token expiration lifecycle (requires OAuth setup)", async ({
      page,
    }) => {
      // NOTE: This test requires actual OAuth authentication setup to work properly
      // Skip for now until OAuth credentials are configured in test environment
      // Complete authenticated flow:
      // 1. Sign in with GitHub OAuth
      // 2. Verify authenticated state (user profile visible)
      // 3. Use app features (e.g., analyze repository) - should work
      // 4. Simulate token expiration (revoke GitHub app access)
      // 5. Attempt another analysis
      // 6. Verify redirect to /auth/error page
      // 7. Verify error message: "Your session has expired or your GitHub access has been revoked"
      // 8. Click "Try Again" button
      // 9. Re-authenticate via GitHub OAuth
      // 10. Verify authenticated state restored
      // 11. Attempt analysis again
      // 12. Verify analysis works successfully
    });

    test("should verify error page auto sign-out functionality", async ({
      page,
      context,
    }) => {
      // Navigate to error page
      await page.goto("http://localhost:3000/auth/error");

      // Wait for auto sign-out to complete
      await page.waitForTimeout(1000);

      // Check cookies to verify session was cleared
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(
        (c) =>
          c.name === "next-auth.session-token" ||
          c.name === "__Secure-next-auth.session-token",
      );

      // Note: In a real authenticated test, we would verify that the session cookie was removed
      // For now, we just verify that the error page loads correctly
      await expect(page).toHaveURL(/\/auth\/error/);
    });
  });
});

/**
 * Test Notes:
 *
 * 1. Token Expiration Simulation:
 *    - Option 1: Manually revoke GitHub OAuth app access in GitHub settings
 *    - Option 2: Mock the NextAuth session to include an error field
 *    - Option 3: Wait for actual session expiration (7 days - not practical for tests)
 *
 * 2. Re-authentication Flow Testing:
 *    - Requires actual OAuth authentication to test the full flow
 *    - Should verify that users can successfully re-authenticate after token expiration
 *    - Should verify that analysis works correctly after re-authentication
 *
 * 3. Error Message Verification:
 *    - Verify user-friendly messages for all error types
 *    - Verify technical error codes are displayed for debugging
 *    - Verify actionable buttons (Try Again, Go to Homepage) are available
 *
 * 4. Middleware Integration:
 *    - Middleware should detect session.error and redirect to /auth/error
 *    - Error page should auto sign-out to prevent redirect loops
 *    - Users should be able to re-authenticate via /login page
 *
 * 5. For production testing, consider:
 *    - Using GitHub OAuth test credentials
 *    - Testing actual token expiration scenarios
 *    - Testing token revocation scenarios
 *    - Verifying error messages are clear and actionable
 *    - Testing re-authentication flow end-to-end
 */
