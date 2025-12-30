"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

/**
 * Providers Component
 *
 * Wraps the application with necessary context providers.
 * Includes NextAuth SessionProvider and ThemeProvider for client-side session access and theme management.
 *
 * This component is marked as "use client" to enable client-side hooks
 * like useSession() and useTheme() in child components.
 *
 * Features:
 * - Provides session context to all client components
 * - Enables useSession() hook throughout the app
 * - Automatically handles session refresh
 * - Provides theme management with system preference detection
 * - Persists theme preference in localStorage
 * - Works with Server Components (wraps children)
 *
 * @param children - React children to wrap with providers
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <Providers>
 *   <YourAppContent />
 * </Providers>
 * ```
 *
 * @example
 * ```tsx
 * // In any client component
 * "use client"
 * import { useSession } from "next-auth/react"
 * import { useTheme } from "next-themes"
 *
 * export function MyComponent() {
 *   const { data: session } = useSession()
 *   const { theme, setTheme } = useTheme()
 *   return <div>Hello {session?.user?.name}</div>
 * }
 * ```
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
