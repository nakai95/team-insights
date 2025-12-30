import { test, expect } from "@playwright/test";

test.describe("Theme Toggle", () => {
  test("should display theme toggle button in header", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Theme toggle button should be visible
    const themeButton = page.getByRole("button", {
      name: /switch to (dark|light) mode/i,
    });
    await expect(themeButton).toBeVisible();
  });

  test("should toggle from light to dark mode", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Force light mode first
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");

    // Verify light mode (no dark class)
    let htmlClass = await html.getAttribute("class");
    expect(htmlClass).not.toContain("dark");

    // Click theme toggle button
    const themeButton = page.getByRole("button", {
      name: /switch to dark mode/i,
    });
    await themeButton.click();

    // Wait for theme change
    await page.waitForTimeout(200);

    // Verify dark mode
    htmlClass = await html.getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Verify localStorage updated
    const storedTheme = await page.evaluate(() =>
      localStorage.getItem("theme"),
    );
    expect(storedTheme).toBe("dark");
  });

  test("should toggle from dark to light mode", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Force dark mode first
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");

    // Verify dark mode
    let htmlClass = await html.getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Click theme toggle button
    const themeButton = page.getByRole("button", {
      name: /switch to light mode/i,
    });
    await themeButton.click();

    // Wait for theme change
    await page.waitForTimeout(200);

    // Verify light mode
    htmlClass = await html.getAttribute("class");
    expect(htmlClass).not.toContain("dark");

    // Verify localStorage updated
    const storedTheme = await page.evaluate(() =>
      localStorage.getItem("theme"),
    );
    expect(storedTheme).toBe("light");
  });

  test("should persist theme preference across page navigation", async ({
    page,
  }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Set to dark mode
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");
    let htmlClass = await html.getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Navigate to Japanese locale
    const localeSwitcher = page.locator('[role="combobox"]').first();
    await localeSwitcher.click();

    // Wait for dropdown to appear and click Japanese option
    const japaneseOption = page.getByText("日本語");
    await japaneseOption.click();

    // Wait for navigation
    await page.waitForURL("/ja");
    await page.waitForLoadState("networkidle");

    // Theme should persist
    htmlClass = await html.getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("should persist theme preference across page reload", async ({
    page,
  }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Set to dark mode explicitly
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");
    let htmlClass = await html.getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Theme should persist
    htmlClass = await html.getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Verify localStorage still has the preference
    const storedTheme = await page.evaluate(() =>
      localStorage.getItem("theme"),
    );
    expect(storedTheme).toBe("dark");
  });

  test("should display correct icon for current theme", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Force light mode
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // In light mode, should show button to switch to dark
    const lightButton = page.getByRole("button", {
      name: /switch to dark mode/i,
    });
    await expect(lightButton).toBeVisible();

    // Toggle to dark
    await lightButton.click();
    await page.waitForTimeout(200);

    // In dark mode, should show button to switch to light
    const darkButton = page.getByRole("button", {
      name: /switch to light mode/i,
    });
    await expect(darkButton).toBeVisible();
  });

  test("should work correctly with system preference (dark)", async ({
    browser,
  }) => {
    // Create context with dark color scheme
    const context = await browser.newContext({
      colorScheme: "dark",
    });
    const page = await context.newPage();

    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Clear any stored theme to use system
    await page.evaluate(() => {
      localStorage.removeItem("theme");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");
    const htmlClass = await html.getAttribute("class");

    // Should respect dark system preference
    expect(htmlClass).toContain("dark");

    await context.close();
  });

  test("should work correctly with system preference (light)", async ({
    browser,
  }) => {
    // Create context with light color scheme
    const context = await browser.newContext({
      colorScheme: "light",
    });
    const page = await context.newPage();

    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.removeItem("theme");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");
    const htmlClass = await html.getAttribute("class");

    // Should respect light system preference (no dark class)
    expect(htmlClass).not.toContain("dark");

    await context.close();
  });
});
