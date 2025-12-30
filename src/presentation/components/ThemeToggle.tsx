"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * ThemeToggle Component
 *
 * A button that toggles between light and dark theme modes.
 * Displays a sun icon in light mode and a moon icon in dark mode.
 *
 * Features:
 * - SSR-safe rendering (prevents hydration errors)
 * - Respects system preference by default
 * - Persists user's theme choice in localStorage
 * - Accessible with proper ARIA labels
 * - Smooth theme transitions
 *
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Avoid hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder with same dimensions during SSR
    return (
      <Button variant="ghost" size="icon" aria-label="Theme toggle">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const toggleTheme = () => {
    if (theme === "system") {
      // If currently on system preference, switch to opposite of resolved theme
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      // If explicitly set, toggle between light/dark
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
