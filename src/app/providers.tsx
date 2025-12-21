"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * Providers Component
 *
 * Wraps the application with necessary context providers.
 * Currently includes NextAuth SessionProvider for client-side session access.
 *
 * This component is marked as "use client" to enable client-side hooks
 * like useSession() in child components.
 *
 * Features:
 * - Provides session context to all client components
 * - Enables useSession() hook throughout the app
 * - Automatically handles session refresh
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
 *
 * export function MyComponent() {
 *   const { data: session } = useSession()
 *   return <div>Hello {session?.user?.name}</div>
 * }
 * ```
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
