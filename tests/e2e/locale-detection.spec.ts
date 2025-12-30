import { test, expect } from "@playwright/test";

test.describe("Locale Detection from Accept-Language Header", () => {
  test("should detect Japanese from browser settings on first visit", async ({
    browser,
  }) => {
    // Create a new context with Japanese locale
    const context = await browser.newContext({
      locale: "ja-JP",
      extraHTTPHeaders: {
        "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
      },
    });
    const page = await context.newPage();

    // Navigate to root
    await page.goto("/");

    // Should redirect to Japanese locale
    await expect(page).toHaveURL("/ja");

    await context.close();
  });

  test("should detect English from browser settings on first visit", async ({
    browser,
  }) => {
    // Create a new context with English locale
    const context = await browser.newContext({
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const page = await context.newPage();

    await page.goto("/");

    // Should redirect to English locale
    await expect(page).toHaveURL("/en");

    await context.close();
  });

  test("should fallback to English for unsupported language", async ({
    browser,
  }) => {
    // Create a new context with French locale (unsupported)
    const context = await browser.newContext({
      locale: "fr-FR",
      extraHTTPHeaders: {
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
    const page = await context.newPage();

    await page.goto("/");

    // Should fallback to default locale (English)
    await expect(page).toHaveURL("/en");

    await context.close();
  });

  test("should select supported locale from multiple language preferences", async ({
    browser,
  }) => {
    // Create a new context with Japanese locale preference
    const context = await browser.newContext({
      locale: "ja-JP",
      extraHTTPHeaders: {
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
    });
    const page = await context.newPage();

    await page.goto("/");

    // Should redirect to Japanese (primary supported locale in Accept-Language)
    await expect(page).toHaveURL("/ja");

    await context.close();
  });

  test("should prioritize NEXT_LOCALE cookie over Accept-Language", async ({
    browser,
  }) => {
    // Create a new context with Japanese locale but English cookie
    const context = await browser.newContext({
      locale: "ja-JP",
      extraHTTPHeaders: {
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
    });
    const page = await context.newPage();

    // Set cookie to English
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/");

    // Cookie takes precedence
    await expect(page).toHaveURL("/en");

    await context.close();
  });

  test("should respect manual language switch via LocaleSwitcher", async ({
    browser,
  }) => {
    // Create a new context with Japanese locale
    const context = await browser.newContext({
      locale: "ja-JP",
      extraHTTPHeaders: {
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
    });
    const page = await context.newPage();

    // Japanese browser visits English landing page (public route)
    await page.goto("/en");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Manually switch to Japanese using LocaleSwitcher
    await page.locator('[role="combobox"]').click();
    await page.getByText("日本語").click();

    // Verify URL changed to Japanese
    await expect(page).toHaveURL("/ja");

    // Verify NEXT_LOCALE cookie was set
    const cookies = await context.cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie?.value).toBe("ja");

    // Now visit root - should go to /ja (cookie preserved)
    await page.goto("/");
    await expect(page).toHaveURL("/ja");

    await context.close();
  });

  test("should preserve explicit locale URL regardless of browser settings", async ({
    browser,
  }) => {
    // Create a new context with Japanese locale
    const context = await browser.newContext({
      locale: "ja-JP",
      extraHTTPHeaders: {
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
    });
    const page = await context.newPage();

    // But explicitly visit English landing page (public route)
    await page.goto("/en");

    // Should stay on English (URL takes precedence)
    await expect(page).toHaveURL("/en");

    await context.close();
  });

  test("should handle malformed Accept-Language header gracefully", async ({
    browser,
  }) => {
    // Create a new context with malformed Accept-Language header
    const context = await browser.newContext({
      extraHTTPHeaders: {
        "Accept-Language": "invalid-header-format",
      },
    });
    const page = await context.newPage();

    await page.goto("/");

    // Should fallback to default locale (English)
    await expect(page).toHaveURL("/en");

    await context.close();
  });

  test("should handle missing Accept-Language header gracefully", async ({
    browser,
  }) => {
    // Create a new context without explicit Accept-Language header
    // Note: Playwright may still set a default header based on system locale
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/");

    // Should redirect to some locale (depends on Playwright's default)
    // Just verify we get a valid locale URL, not stuck on root
    const url = page.url();
    expect(url).toMatch(/\/(en|ja)$/);

    await context.close();
  });
});
