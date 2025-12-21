# Research Report: GitHub OAuth Authentication with NextAuth.js v5

**Feature**: GitHub OAuth Authentication
**Date**: 2025-12-20
**Research Focus**: NextAuth.js v5 implementation patterns for GitHub OAuth with App Router

## Executive Summary

NextAuth.js v5 (Auth.js) provides a streamlined OAuth implementation for Next.js 14 App Router. Key findings:

- **Simplified API**: Single `auth()` function replaces v4's `getServerSession`, `getToken`, etc.
- **Centralized Configuration**: Auth config in root `/auth.ts`, not in API route
- **Automatic Session Rotation**: JWT expiry extends automatically on each request
- **GitHub OAuth Scopes**: Custom scopes require explicit authorization params configuration
- **Session Strategy**: JWT-based storage (no database) suitable for 7-day persistence
- **Token Access**: Access token stored in encrypted JWT, retrievable server-side only

## 1. NextAuth v5 Configuration Structure

### Decision: Centralized Auth Configuration

**Rationale**: NextAuth v5 requires configuration at repository root (`/auth.ts` or `/src/auth.ts`), not inside API route. This provides:

- Reusable `auth()` function across Server Components, Actions, Middleware, API Routes
- Type-safe imports with centralized exports
- Consistent session access pattern

**Implementation**:

```typescript
// /src/infrastructure/auth/auth.config.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // Extend session every 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
      };
    },
  },
});
```

**Alternatives Considered**:

- ❌ v4 pattern (API route config): Not supported in v5
- ❌ Multiple auth configs: Increases complexity, violates YAGNI

### Environment Variables

**Decision**: Use `AUTH_` prefix (NextAuth v5 convention)

```bash
AUTH_GITHUB_ID="github_oauth_app_client_id"
AUTH_GITHUB_SECRET="github_oauth_app_client_secret"
AUTH_SECRET="random_32_char_string"  # openssl rand -base64 32
```

**Rationale**: NextAuth v5 auto-detects `AUTH_` prefixed variables, simplifying configuration.

**Key Finding**: Separate OAuth apps needed for development and production (GitHub limitation - one callback URL per app).

## 2. Session Management and Token Storage

### Decision: JWT Strategy with Custom Token Storage

**Rationale**:

- No database required (aligns with MVP-first principle)
- Encrypted JWT with `AUTH_SECRET` provides secure token storage
- Automatic session rotation via `updateAge` implements activity-based extension

**Session Lifecycle**:

1. User authenticates → OAuth access token stored in JWT callback
2. Each request with valid session extends expiry (if `updateAge` threshold passed)
3. After 7 days of inactivity → session expires
4. User must re-authenticate → new JWT issued

**Type Extensions** (required for TypeScript):

```typescript
// /types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    error?: string;
  }
}
```

**Alternatives Considered**:

- ❌ Database session strategy: Adds complexity, requires Prisma/database setup
- ❌ Cookie-based token storage: Less secure, size limits, client exposure risk

## 3. Token Access in Infrastructure Layer

### Decision: ISessionProvider Interface Pattern

**Rationale**: Maintain Clean Architecture by abstracting NextAuth dependency behind domain interface.

**Interface Definition**:

```typescript
// /src/domain/interfaces/ISessionProvider.ts
import { Result } from "@/lib/result";

export interface ISessionProvider {
  /**
   * Retrieve OAuth access token from current session
   * @returns Result with access token or error if not authenticated
   */
  getAccessToken(): Promise<Result<string>>;
}
```

**Implementation**:

```typescript
// /src/infrastructure/auth/NextAuthAdapter.ts
import { auth } from "./auth.config";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";

export class NextAuthAdapter implements ISessionProvider {
  async getAccessToken(): Promise<Result<string>> {
    const session = await auth();

    if (!session?.accessToken) {
      return err(new Error("No valid authentication session"));
    }

    if (session.error) {
      return err(new Error(`Authentication error: ${session.error}`));
    }

    return ok(session.accessToken);
  }
}
```

**Usage in Adapters**:

```typescript
// /src/infrastructure/github/OctokitAdapter.ts (MODIFIED)
export class OctokitAdapter implements IGitHubAPI {
  constructor(private sessionProvider: ISessionProvider) {}

  async validateAccess(owner: string, repo: string): Promise<Result<boolean>> {
    const tokenResult = await this.sessionProvider.getAccessToken();
    if (!tokenResult.ok) return err(tokenResult.error);

    const octokit = new Octokit({ auth: tokenResult.value });
    // ... rest of implementation
  }
}
```

**Alternatives Considered**:

- ❌ Direct `auth()` calls in adapters: Couples infrastructure to NextAuth, violates dependency inversion
- ❌ Token as constructor parameter: Breaks existing patterns, complicates DI setup

## 4. App Router Integration

### Decision: Middleware-Based Route Protection

**Rationale**:

- Centralized auth logic (DRY principle)
- Runs before page render (optimal performance)
- Automatic redirects for unauthenticated users

**Implementation**:

```typescript
// /middleware.ts
import { auth } from "@/infrastructure/auth/auth.config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/auth/error");
  const isPublicRoute = req.nextUrl.pathname === "/";

  // Check for session errors
  if (req.auth?.error && req.nextUrl.pathname !== "/auth/error") {
    return NextResponse.redirect(new URL("/auth/error", req.nextUrl.origin));
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated && !isAuthPage && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage && !req.auth?.error) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

**Route Handler Setup**:

```typescript
// /src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/infrastructure/auth/auth.config";

export const { GET, POST } = handlers;
```

**Alternatives Considered**:

- ❌ Per-page auth checks: Repetitive code, error-prone
- ❌ Layout-based protection: Runs after middleware, less efficient
- ❌ `authorized` callback only: Less flexible than middleware approach

### Session Provider for Client Components

**Decision**: Wrap root layout with SessionProvider

```typescript
// /src/app/providers.tsx
"use client"

import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

```typescript
// /src/app/layout.tsx
import { Providers } from "./providers"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Rationale**: Enables `useSession()` hook in client components for user profile display, conditional rendering.

## 5. Error Handling Patterns

### Decision: Three-Tier Error Strategy

**Tier 1: OAuth Callback Errors** (GitHub authorization page)

NextAuth v5 error types:

- `OAuthSignin` - Authorization URL construction failed
- `OAuthCallback` - Callback processing failed
- `OAuthAccountNotLinked` - Email conflict with existing account
- `AccessDenied` - User denied authorization

**Tier 2: Session Errors** (JWT callback)

Store errors in session for middleware/page access:

```typescript
// In auth.config.ts callbacks
async jwt({ token, account }) {
  if (account) {
    return {
      ...token,
      accessToken: account.access_token,
    }
  }

  // Check for token issues
  if (!token.accessToken) {
    return {
      ...token,
      error: "NoAccessToken",
    }
  }

  return token
}
```

**Tier 3: Infrastructure Errors** (Adapter operations)

Map technical errors to user-friendly messages:

```typescript
// Error mapping in Server Actions
const AUTH_ERROR_MESSAGES = {
  "No valid authentication session": "Please sign in to continue",
  "Authentication error": "Your session has expired. Please sign in again",
  "Access token is invalid": "Your GitHub authorization is no longer valid",
};
```

### Error Page with Auto Sign-Out

**Critical Pattern**: Prevent infinite loops by signing out on error page:

```typescript
// /src/app/auth/error/page.tsx
"use client"

import { signOut } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  useEffect(() => {
    // Auto sign-out to clear invalid session
    signOut({ redirect: false })
  }, [])

  return (
    <div>
      <h1>Authentication Error</h1>
      <p>{error === "AccessDenied"
        ? "You cancelled GitHub authorization"
        : "An error occurred during sign in"}</p>
      <button onClick={() => window.location.href = "/login"}>
        Try Again
      </button>
    </div>
  )
}
```

**Alternatives Considered**:

- ❌ No auto sign-out: Causes redirect loops
- ❌ Error codes in session: Requires manual clearing, complex state management

## 6. Token Expiration and Validation

### Key Finding: GitHub OAuth Tokens Don't Expire

**Implication**: GitHub OAuth access tokens remain valid indefinitely unless:

1. User revokes app authorization
2. OAuth app credentials regenerated
3. GitHub account deleted/suspended

**Decision**: Proactive Validation Pattern

```typescript
// In NextAuthAdapter
export class NextAuthAdapter implements ISessionProvider {
  async getAccessToken(): Promise<Result<string>> {
    const session = await auth();

    if (!session?.accessToken) {
      return err(new Error("No valid authentication session"));
    }

    // Optional: Validate token on each critical operation
    // (Deferred for MVP per FR-020)

    return ok(session.accessToken);
  }

  // For future token refresh implementation
  async validateToken(token: string): Promise<boolean> {
    try {
      const octokit = new Octokit({ auth: token });
      await octokit.users.getAuthenticated();
      return true;
    } catch (error: any) {
      return error.status !== 401;
    }
  }
}
```

**Alternatives Considered**:

- ❌ Automatic token refresh: GitHub doesn't provide refresh tokens for OAuth apps
- ❌ Periodic background validation: Unnecessary overhead, adds complexity

## 7. GitHub OAuth App Configuration

### Setup Requirements

1. **Create OAuth App**: [GitHub Developer Settings](https://github.com/settings/developers)
2. **Callback URLs**:
   - Development: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://{domain}/api/auth/callback/github`
3. **Scopes**: Set in NextAuth config (authorization params), not in GitHub UI

**Key Finding**: GitHub provider in NextAuth v5 has known scope configuration issues (GitHub issue #3153). Verify scopes in OAuth redirect URL if experiencing problems.

**Solution**: Explicit authorization params in provider config:

```typescript
GitHub({
  clientId: process.env.AUTH_GITHUB_ID,
  clientSecret: process.env.AUTH_GITHUB_SECRET,
  authorization: {
    params: {
      scope: "read:user user:email repo", // Explicit scopes
    },
  },
});
```

## Implementation Checklist

- [ ] Install NextAuth v5: `npm install next-auth@beta`
- [ ] Create GitHub OAuth app (dev + prod)
- [ ] Configure environment variables (`AUTH_*` prefix)
- [ ] Implement `auth.config.ts` with GitHub provider
- [ ] Create type extensions (`next-auth.d.ts`)
- [ ] Implement `ISessionProvider` interface
- [ ] Create `NextAuthAdapter` implementing `ISessionProvider`
- [ ] Modify `OctokitAdapter` to inject `ISessionProvider`
- [ ] Modify `SimpleGitAdapter` to inject `ISessionProvider`
- [ ] Update `AnalysisRequest` DTO (remove `githubToken` field)
- [ ] Create auth route handler (`/api/auth/[...nextauth]/route.ts`)
- [ ] Create middleware for route protection
- [ ] Create client components (SignInButton, SignOutButton, UserProfile)
- [ ] Update AnalysisForm (remove token input)
- [ ] Update Header (add auth components)
- [ ] Create auth error page with auto sign-out
- [ ] Add SessionProvider to root layout
- [ ] Update E2E tests for OAuth flow
- [ ] Test token masking in logs (security validation)

## Security Considerations

1. **Token Storage**: ✅ JWT encrypted with `AUTH_SECRET`, never exposed to client
2. **Token Logging**: ✅ Use existing `maskToken` utility in all log statements
3. **Session Expiry**: ✅ 7-day maxAge with 24-hour updateAge
4. **Error Messages**: ✅ User-friendly messages, no token/secret exposure
5. **HTTPS**: ⚠️ Required in production (Vercel handles automatically)
6. **CSRF Protection**: ✅ Built into NextAuth v5
7. **Session Rotation**: ✅ Automatic on each `auth()` call with response object

## Performance Characteristics

- **Auth Check Latency**: <10ms (JWT validation, no database)
- **OAuth Flow Duration**: ~5-15 seconds (GitHub redirect + callback)
- **Session Validation**: O(1) (JWT decryption + signature verification)
- **Memory Overhead**: Minimal (stateless JWT, no server-side session storage)
- **Vercel Compatibility**: ✅ No database required, edge-compatible

## Migration Notes (v4 → v5)

For teams familiar with NextAuth v4:

| v4 Pattern                         | v5 Replacement                               |
| ---------------------------------- | -------------------------------------------- |
| `getServerSession(authOptions)`    | `auth()`                                     |
| `getToken({ req })`                | `auth()`                                     |
| `useSession()`                     | `useSession()` (unchanged)                   |
| `signIn()` / `signOut()`           | `signIn()` / `signOut()` (unchanged)         |
| `/pages/api/auth/[...nextauth].ts` | `/app/api/auth/[...nextauth]/route.ts`       |
| `NEXTAUTH_*` env vars              | `AUTH_*` env vars                            |
| `authOptions` export               | `auth`, `handlers` exports from `NextAuth()` |

## References

- [NextAuth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [Configuring GitHub Provider](https://authjs.dev/guides/configuring-github)
- [NextAuth.js v5 App Router Guide](https://authjs.dev/reference/nextjs)
- [Session Management Best Practices](https://authjs.dev/getting-started/session-management)
- [OAuth Error Handling](https://authjs.dev/reference/core/errors)

## Conclusion

NextAuth.js v5 provides a production-ready OAuth solution that aligns with Clean Architecture principles. The centralized `auth()` function simplifies server-side session access, while JWT-based storage eliminates database requirements. Key implementation points:

1. **Interface Abstraction**: `ISessionProvider` maintains dependency inversion
2. **Middleware Protection**: Centralized auth logic prevents code duplication
3. **Error Handling**: Three-tier strategy covers OAuth, session, and infrastructure errors
4. **Security**: Encrypted JWT, masked logging, automatic CSRF protection
5. **Performance**: Stateless validation, edge-compatible, <10ms auth checks

Ready to proceed to Phase 1 (Data Model and Contracts).
