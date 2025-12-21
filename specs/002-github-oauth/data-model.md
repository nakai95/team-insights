# Data Model: GitHub OAuth Authentication

**Feature**: GitHub OAuth Authentication
**Date**: 2025-12-20
**Purpose**: Define data structures for session management and authentication state

## Overview

This feature introduces session-based authentication using NextAuth.js v5. The data model focuses on:

1. **Session entities** - Representing authenticated user sessions
2. **OAuth configuration** - GitHub OAuth app credentials
3. **Modified DTOs** - Updates to existing analysis request DTOs

**Key Principle**: No database required (JWT-based sessions), all data structures are in-memory or configuration-based.

## Core Entities

### 1. User Session (Runtime Entity)

**Purpose**: Represents an authenticated user's session containing OAuth access token and user metadata.

**Storage**: Encrypted JWT (managed by NextAuth.js)

**Lifecycle**: Created on OAuth callback, validated on each request, expires after 7 days of inactivity

**Attributes**:

| Field         | Type     | Required | Description                        | Validation                            |
| ------------- | -------- | -------- | ---------------------------------- | ------------------------------------- |
| `user.id`     | `string` | Yes      | GitHub user ID                     | Non-empty string                      |
| `user.name`   | `string` | No       | GitHub username/display name       | Max 255 chars                         |
| `user.email`  | `string` | No       | Primary email from GitHub          | Valid email format                    |
| `user.image`  | `string` | No       | GitHub avatar URL                  | Valid URL                             |
| `accessToken` | `string` | Yes      | GitHub OAuth access token          | 40-char hex string (ghp\_\*)          |
| `expires`     | `Date`   | Yes      | Session expiration timestamp       | Future date, max 7 days from creation |
| `error`       | `string` | No       | Auth error code if session invalid | Enum: see Error States                |

**Type Definition**:

```typescript
// Extended NextAuth Session type
// /types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    };
    accessToken: string;
    expires: string; // ISO 8601 date string
    error?: string;
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    accessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    sub: string; // User ID
    accessToken?: string;
    error?: string;
    exp: number; // Expiration timestamp
    iat: number; // Issued at timestamp
  }
}
```

**State Transitions**:

```
[Unauthenticated] --OAuth Sign In--> [Authenticated]
[Authenticated] --Activity (within 7 days)--> [Authenticated, Extended Expiry]
[Authenticated] --7 Days Inactivity--> [Expired]
[Authenticated] --Explicit Sign Out--> [Unauthenticated]
[Authenticated] --Token Revoked--> [Error State]
[Error State] --Sign Out--> [Unauthenticated]
```

**Error States**:

| Error Code                | Trigger                   | User Impact                 | Resolution            |
| ------------------------- | ------------------------- | --------------------------- | --------------------- |
| `RefreshAccessTokenError` | Token validation failure  | Prompted to re-authenticate | Sign out + sign in    |
| `NoAccessToken`           | Missing token in session  | Access denied               | Sign in required      |
| `OAuthAccountNotLinked`   | Email conflict on sign-in | Sign-in blocked             | Use different account |
| `AccessDenied`            | User denied OAuth         | Sign-in cancelled           | Retry authorization   |

### 2. OAuth Configuration (Static Configuration)

**Purpose**: Store GitHub OAuth application credentials used for authentication flow.

**Storage**: Environment variables (`.env.local`)

**Attributes**:

| Variable             | Type     | Required | Description                                   | Example                                   |
| -------------------- | -------- | -------- | --------------------------------------------- | ----------------------------------------- |
| `AUTH_GITHUB_ID`     | `string` | Yes      | GitHub OAuth app client ID                    | `Iv1.a1b2c3d4e5f6g7h8`                    |
| `AUTH_GITHUB_SECRET` | `string` | Yes      | GitHub OAuth app client secret                | `abc123def456ghi789jkl012mno345pqr678stu` |
| `AUTH_SECRET`        | `string` | Yes      | Secret for JWT encryption                     | `randomBase64String32Chars==`             |
| `NEXTAUTH_URL`       | `string` | No       | Base URL for callbacks (auto-detected in dev) | `https://example.com`                     |

**Validation Schema** (Zod):

```typescript
// /src/infrastructure/auth/env.schema.ts
import { z } from "zod";

export const authEnvSchema = z.object({
  AUTH_GITHUB_ID: z.string().min(1, "GitHub OAuth client ID is required"),
  AUTH_GITHUB_SECRET: z
    .string()
    .min(1, "GitHub OAuth client secret is required"),
  AUTH_SECRET: z.string().min(32, "Auth secret must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function validateAuthEnv(): AuthEnv {
  return authEnvSchema.parse({
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });
}
```

## Modified Entities

### 3. AnalysisRequest DTO (Modified)

**Change**: Remove `githubToken` field (now sourced from session)

**Before**:

```typescript
export interface AnalysisRequest {
  repositoryUrl: string;
  githubToken: string; // ← REMOVED
  dateRange?: {
    start: string;
    end: string;
  };
}
```

**After**:

```typescript
// /src/application/dto/AnalysisRequest.ts
export interface AnalysisRequest {
  repositoryUrl: string;
  // githubToken removed - sourced from session via ISessionProvider
  dateRange?: {
    start: string;
    end: string;
  };
}
```

**Impact**: Server Actions must inject session provider instead of accepting token parameter.

## Domain Interfaces

### 4. ISessionProvider (New Domain Interface)

**Purpose**: Abstract session management, allowing infrastructure layer to provide tokens without exposing NextAuth details to domain/application layers.

**Location**: `/src/domain/interfaces/ISessionProvider.ts`

**Definition**:

```typescript
import { Result } from "@/lib/result";

/**
 * Interface for retrieving OAuth access tokens from authenticated sessions.
 *
 * Implementations:
 * - NextAuthAdapter: Production implementation using NextAuth.js v5
 * - MockSessionProvider: Test implementation for unit tests
 */
export interface ISessionProvider {
  /**
   * Retrieve GitHub OAuth access token from current authenticated session.
   *
   * @returns Result containing access token if authenticated, or error if:
   *   - No active session
   *   - Session expired
   *   - Token missing from session
   *   - Session error state
   *
   * @example
   * const tokenResult = await sessionProvider.getAccessToken()
   * if (!tokenResult.ok) {
   *   return err(new Error("Authentication required"))
   * }
   * const octokit = new Octokit({ auth: tokenResult.value })
   */
  getAccessToken(): Promise<Result<string>>;

  /**
   * Optional: Get full session data including user profile
   * (Deferred for MVP - only getAccessToken() required initially)
   */
  // getSession(): Promise<Result<Session>>
}
```

**Implementations**:

1. **NextAuthAdapter** (Production):

```typescript
// /src/infrastructure/auth/NextAuthAdapter.ts
import { auth } from "./auth.config";
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";

export class NextAuthAdapter implements ISessionProvider {
  async getAccessToken(): Promise<Result<string>> {
    const session = await auth();

    if (!session) {
      return err(new Error("No active session"));
    }

    if (session.error) {
      return err(new Error(`Session error: ${session.error}`));
    }

    if (!session.accessToken) {
      return err(new Error("No access token in session"));
    }

    return ok(session.accessToken);
  }
}
```

2. **MockSessionProvider** (Testing):

```typescript
// /tests/unit/infrastructure/__mocks__/MockSessionProvider.ts
import { ISessionProvider } from "@/domain/interfaces/ISessionProvider";
import { Result, ok, err } from "@/lib/result";

export class MockSessionProvider implements ISessionProvider {
  constructor(private mockToken?: string) {}

  async getAccessToken(): Promise<Result<string>> {
    if (!this.mockToken) {
      return err(new Error("No active session"));
    }
    return ok(this.mockToken);
  }

  // Helper for tests
  setToken(token: string): void {
    this.mockToken = token;
  }

  clearToken(): void {
    this.mockToken = undefined;
  }
}
```

## Data Flow Diagrams

### OAuth Sign-In Flow

```
┌─────────┐     1. Click "Sign in"     ┌──────────────┐
│ User    │─────────────────────────────>│ SignInButton │
└─────────┘                              └──────────────┘
                                                │
                                         2. signIn("github")
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────┐
│ NextAuth v5 (auth.config.ts)                           │
│ - Redirect to GitHub OAuth authorization page          │
│ - Scopes: read:user, user:email, repo                 │
└─────────────────────────────────────────────────────────┘
                │
                │ 3. Redirect to GitHub
                ▼
┌─────────────────────────────────────┐
│ GitHub OAuth Authorization          │
│ - User approves/denies permissions  │
└─────────────────────────────────────┘
                │
                │ 4. Callback with auth code
                ▼
┌─────────────────────────────────────────────────────────┐
│ /api/auth/callback/github                              │
│ - Exchange auth code for access token                  │
│ - JWT callback: Store access_token in JWT              │
│ - Session callback: Add access_token to session object │
└─────────────────────────────────────────────────────────┘
                │
                │ 5. Create encrypted JWT
                ▼
┌─────────────────────────────────────┐
│ HTTP-only Cookie: next-auth.session │
│ {                                   │
│   user: { id, name, email, image }, │
│   accessToken: "ghp_...",          │
│   expires: "2025-12-27T..."        │
│ }                                   │
└─────────────────────────────────────┘
                │
                │ 6. Redirect to app
                ▼
┌─────────────────────────────────────┐
│ User - Authenticated State          │
│ - Header shows user profile         │
│ - Can access analysis features      │
└─────────────────────────────────────┘
```

### Repository Analysis with Session Token

```
┌─────────┐     1. Enter repo URL     ┌──────────────┐
│ User    │─────────────────────────────>│ AnalysisForm │
└─────────┘                              └──────────────┘
                                                │
                                         2. Submit (no token input)
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────┐
│ Server Action: analyzeRepository({ repositoryUrl })    │
│ - No githubToken parameter                             │
└─────────────────────────────────────────────────────────┘
                │
                │ 3. Inject NextAuthAdapter
                ▼
┌─────────────────────────────────────────────────────────┐
│ NextAuthAdapter.getAccessToken()                        │
│ - Call auth() to get session                           │
│ - Extract accessToken from session                     │
│ - Return Result<string>                                │
└─────────────────────────────────────────────────────────┘
                │
                │ 4. Result<token>
                ▼
┌─────────────────────────────────────────────────────────┐
│ OctokitAdapter (with ISessionProvider)                 │
│ - getAccessToken() → token                             │
│ - new Octokit({ auth: token })                         │
│ - Perform GitHub API calls                             │
└─────────────────────────────────────────────────────────┘
                │
                │ 5. Analysis result
                ▼
┌─────────────────────────────────────┐
│ User - View Results                 │
└─────────────────────────────────────┘
```

## Validation Rules

### Session Validation

| Check           | Condition                                | Action                                     |
| --------------- | ---------------------------------------- | ------------------------------------------ |
| Session exists  | `session !== null`                       | Proceed                                    |
| Token present   | `session.accessToken !== undefined`      | Proceed                                    |
| Not expired     | `new Date(session.expires) > new Date()` | Proceed                                    |
| No error state  | `session.error === undefined`            | Proceed                                    |
| **Any failure** | -                                        | Return 401 Unauthorized, redirect to login |

### Repository URL Validation (Unchanged)

Existing Zod schema remains:

```typescript
const repositoryUrlSchema = z
  .string()
  .url()
  .regex(
    /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/,
    "Invalid GitHub repository URL",
  );
```

## Security Considerations

### Token Storage Security

| Aspect               | Implementation                   | Security Benefit                       |
| -------------------- | -------------------------------- | -------------------------------------- |
| **Encryption**       | JWT encrypted with `AUTH_SECRET` | Token unreadable without secret        |
| **HTTP-only Cookie** | NextAuth default                 | Prevents client-side JavaScript access |
| **Secure Flag**      | Enabled in production            | HTTPS-only transmission                |
| **SameSite**         | `Lax` (NextAuth default)         | CSRF protection                        |
| **Token Masking**    | Existing `maskToken()` utility   | No tokens in logs/errors               |

### Access Control

| Resource          | Protection Mechanism   | Enforcement Point  |
| ----------------- | ---------------------- | ------------------ |
| Analysis features | Middleware redirect    | `/middleware.ts`   |
| Server Actions    | ISessionProvider check | Action entry point |
| API Routes        | `auth()` validation    | Route handler      |
| Client components | SessionProvider        | React context      |

## Migration Impact

### Before (Token Parameter)

```typescript
// Old pattern
const result = await analyzeRepository({
  repositoryUrl: "https://github.com/owner/repo",
  githubToken: "ghp_userProvidedToken123", // ← User input
});
```

### After (Session-Based)

```typescript
// New pattern
const result = await analyzeRepository({
  repositoryUrl: "https://github.com/owner/repo",
  // No token parameter - sourced from session internally
});
```

**Breaking Change**: Existing API consumers must authenticate via OAuth before calling `analyzeRepository`.

## Testing Strategy

### Unit Tests

**Domain Layer**: No changes (no domain entities modified)

**Infrastructure Layer**:

```typescript
// NextAuthAdapter.test.ts
describe("NextAuthAdapter", () => {
  it("should return access token from valid session", async () => {
    // Mock auth() to return session with token
    const adapter = new NextAuthAdapter();
    const result = await adapter.getAccessToken();
    expect(result.ok).toBe(true);
    expect(result.value).toMatch(/^ghp_/);
  });

  it("should return error when no session", async () => {
    // Mock auth() to return null
    const adapter = new NextAuthAdapter();
    const result = await adapter.getAccessToken();
    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("No active session");
  });
});
```

### Integration Tests

```typescript
// OctokitAdapter.test.ts (modified)
describe("OctokitAdapter with Session Provider", () => {
  it("should fetch pull requests using session token", async () => {
    const mockProvider = new MockSessionProvider("ghp_testToken123");
    const adapter = new OctokitAdapter(mockProvider);

    const result = await adapter.getPullRequests("owner", "repo");
    expect(result.ok).toBe(true);
  });

  it("should fail when no session available", async () => {
    const mockProvider = new MockSessionProvider(); // No token
    const adapter = new OctokitAdapter(mockProvider);

    const result = await adapter.getPullRequests("owner", "repo");
    expect(result.ok).toBe(false);
  });
});
```

### E2E Tests

```typescript
// auth-flow.spec.ts
test("OAuth sign-in and repository analysis", async ({ page }) => {
  // 1. Visit app
  await page.goto("/");

  // 2. Click sign in
  await page.click('button:has-text("Sign in with GitHub")');

  // 3. GitHub OAuth page (use test account)
  await page.fill('input[name="login"]', process.env.TEST_GITHUB_USERNAME);
  await page.fill('input[name="password"]', process.env.TEST_GITHUB_PASSWORD);
  await page.click('input[type="submit"]');

  // 4. Authorize app
  await page.click('button:has-text("Authorize")');

  // 5. Back to app - should see user profile
  await expect(page.locator("text=Welcome")).toBeVisible();

  // 6. Analyze repository (no token input)
  await page.fill(
    'input[name="repositoryUrl"]',
    "https://github.com/test/repo",
  );
  await page.click('button:has-text("Analyze")');

  // 7. Verify results displayed
  await expect(page.locator("text=Analysis Results")).toBeVisible();
});
```

## Summary

This data model introduces minimal new entities (Session, OAuth Config) while preserving existing domain models. Key design decisions:

1. **JWT-based sessions**: No database required, aligns with MVP-first principle
2. **ISessionProvider interface**: Maintains Clean Architecture, testable adapters
3. **AnalysisRequest DTO change**: Breaking change but simplifies API (one less parameter)
4. **Type extensions**: TypeScript-first approach ensures compile-time safety
5. **Security by default**: HTTP-only cookies, encrypted JWTs, token masking

Ready to proceed to API contracts generation.
