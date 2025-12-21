# Server Actions Contract: GitHub OAuth Authentication

**Feature**: GitHub OAuth Authentication
**Date**: 2025-12-20
**Purpose**: Define contracts for modified Server Actions that now use session-based authentication

## Overview

This document specifies the behavioral changes to existing Server Actions after implementing OAuth authentication. The primary change is the removal of `githubToken` parameter, with tokens now sourced from authenticated sessions.

## Modified Server Actions

### 1. `analyzeRepository` (Modified)

**Location**: `/src/app/actions/analyzeRepository.ts`

**Purpose**: Analyze a GitHub repository's contributor activity metrics

**Changes**:

- ❌ **Removed**: `githubToken` parameter
- ✅ **Added**: Internal session provider injection to fetch token

#### Function Signature

**Before**:

```typescript
export async function analyzeRepository(
  request: AnalysisRequest, // Contains githubToken field
): Promise<Result<AnalysisResult, AnalysisError>>;
```

**After**:

```typescript
export async function analyzeRepository(
  request: AnalysisRequest, // No githubToken field
): Promise<Result<AnalysisResult, AnalysisError>>;
```

#### Request Schema

```typescript
interface AnalysisRequest {
  repositoryUrl: string; // GitHub repository URL
  dateRange?: {
    // Optional date range for analysis
    start: string; // ISO 8601 date string
    end: string; // ISO 8601 date string
  };
}
```

**Zod Validation**:

```typescript
import { z } from "zod";

const analysisRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url("Must be a valid URL")
    .regex(
      /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/,
      "Must be a GitHub repository URL (e.g., https://github.com/owner/repo)",
    ),
  dateRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional()
    .refine(
      (data) => {
        if (!data) return true;
        return new Date(data.start) <= new Date(data.end);
      },
      { message: "Start date must be before or equal to end date" },
    ),
});
```

#### Response Schema

**Success Response**:

```typescript
interface AnalysisResult {
  analysis: {
    id: string; // Analysis ID (UUID)
    repositoryUrl: string; // Analyzed repository URL
    analyzedAt: string; // ISO 8601 timestamp
    dateRange: {
      start: string; // ISO 8601 date
      end: string; // ISO 8601 date
    };
    status: "completed";
  };
  contributors: Contributor[]; // Array of contributor metrics
  summary: {
    totalContributors: number;
    totalCommits: number;
    totalPullRequests: number;
    totalReviewComments: number;
    analysisTimeMs: number; // Performance metric
  };
}
```

**Error Response**:

```typescript
interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
  details?: unknown;
}

enum AnalysisErrorCode {
  INVALID_URL = "INVALID_URL",
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED", // NEW
  TOKEN_EXPIRED = "TOKEN_EXPIRED", // NEW
  REPOSITORY_NOT_FOUND = "REPOSITORY_NOT_FOUND",
  ACCESS_DENIED = "ACCESS_DENIED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  CLONE_FAILED = "CLONE_FAILED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

#### Error Handling

**New Authentication Errors**:

| Error Code                | Trigger             | User-Facing Message                                  | HTTP Status (if API) |
| ------------------------- | ------------------- | ---------------------------------------------------- | -------------------- |
| `AUTHENTICATION_REQUIRED` | No active session   | "Please sign in with GitHub to analyze repositories" | 401                  |
| `TOKEN_EXPIRED`           | Session error state | "Your session has expired. Please sign in again"     | 401                  |
| `ACCESS_DENIED`           | GitHub API 403/404  | "You don't have access to this repository"           | 403                  |

**Example Error Response**:

```typescript
{
  ok: false,
  error: {
    code: "AUTHENTICATION_REQUIRED",
    message: "Please sign in with GitHub to analyze repositories"
  }
}
```

#### Internal Implementation Flow

```
1. User calls analyzeRepository({ repositoryUrl, dateRange })
2. Server Action entry point
3. Inject NextAuthAdapter as ISessionProvider
4. Call sessionProvider.getAccessToken()
5. If no token → return AUTHENTICATION_REQUIRED error
6. If token exists → initialize OctokitAdapter(sessionProvider)
7. Initialize SimpleGitAdapter(sessionProvider)
8. Pass adapters to AnalyzeRepository use case
9. Execute analysis
10. Return result
```

**Code Structure**:

```typescript
// Simplified implementation
export async function analyzeRepository(
  request: AnalysisRequest,
): Promise<Result<AnalysisResult, AnalysisError>> {
  try {
    // Validate input
    const validated = analysisRequestSchema.parse(request);

    // Initialize session provider
    const sessionProvider = new NextAuthAdapter();

    // Check authentication
    const tokenResult = await sessionProvider.getAccessToken();
    if (!tokenResult.ok) {
      return {
        ok: false,
        error: {
          code: AnalysisErrorCode.AUTHENTICATION_REQUIRED,
          message: "Please sign in with GitHub to analyze repositories",
        },
      };
    }

    // Initialize infrastructure with session provider
    const gitOperations = new SimpleGitAdapter(sessionProvider);
    const githubAPI = new OctokitAdapter(sessionProvider);
    const tempDirManager = new TempDirectoryManager();

    // Initialize use cases
    const fetchGitData = new FetchGitData(gitOperations, githubAPI);
    const calculateMetrics = new CalculateMetrics();
    const analyzeRepo = new AnalyzeRepository(
      fetchGitData,
      calculateMetrics,
      tempDirManager,
    );

    // Execute analysis
    const result = await analyzeRepo.execute({
      repositoryUrl: validated.repositoryUrl,
      dateRangeStart: validated.dateRange?.start
        ? new Date(validated.dateRange.start)
        : undefined,
      dateRangeEnd: validated.dateRange?.end
        ? new Date(validated.dateRange.end)
        : undefined,
    });

    if (!result.ok) {
      // Map domain errors to API errors
      const errorCode = mapErrorCode(result.error.message);
      return {
        ok: false,
        error: {
          code: errorCode,
          message: result.error.message,
        },
      };
    }

    // ... transform to AnalysisResult DTO
    return { ok: true, value: analysisResult };
  } catch (error) {
    // Handle validation and unexpected errors
    return {
      ok: false,
      error: {
        code: AnalysisErrorCode.INTERNAL_ERROR,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
    };
  }
}
```

#### Authentication Requirements

| Condition           | Action                                 |
| ------------------- | -------------------------------------- |
| No session cookie   | Return `AUTHENTICATION_REQUIRED` error |
| Session expired     | Return `TOKEN_EXPIRED` error           |
| Session error state | Return `TOKEN_EXPIRED` error           |
| Valid session       | Proceed with analysis                  |

#### Performance Characteristics

- **Auth Check Overhead**: +5-10ms (JWT validation)
- **Overall Impact**: Negligible (<1% of total analysis time)
- **Session Rotation**: Automatic on each call (extends expiry if >24h since last update)

#### Backward Compatibility

**Breaking Change**: ❌ This is a **breaking change** for API consumers.

**Migration Path**:

1. Remove `githubToken` from request body
2. Authenticate user via OAuth before calling action
3. Ensure session cookie present in request

**Before** (v1):

```typescript
const result = await analyzeRepository({
  repositoryUrl: "https://github.com/owner/repo",
  githubToken: "ghp_userProvidedToken123", // User input
});
```

**After** (v2):

```typescript
// User must be authenticated first
await signIn("github");

// Then call without token
const result = await analyzeRepository({
  repositoryUrl: "https://github.com/owner/repo",
  // No githubToken field
});
```

## Client-Side Usage

### React Server Component

```typescript
// app/dashboard/page.tsx
import { analyzeRepository } from "@/app/actions/analyzeRepository"
import { redirect } from "next/navigation"
import { auth } from "@/infrastructure/auth/auth.config"

export default async function DashboardPage() {
  // Check auth server-side
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  async function handleAnalysis(formData: FormData) {
    "use server"

    const repoUrl = formData.get("repositoryUrl") as string

    const result = await analyzeRepository({
      repositoryUrl: repoUrl,
    })

    if (!result.ok) {
      // Handle error
      return { error: result.error.message }
    }

    // Handle success
    return { data: result.value }
  }

  return (
    <form action={handleAnalysis}>
      <input name="repositoryUrl" type="url" required />
      <button type="submit">Analyze</button>
    </form>
  )
}
```

### Client Component (with form action)

```typescript
// components/AnalysisForm.tsx
"use client"

import { analyzeRepository } from "@/app/actions/analyzeRepository"
import { useState } from "react"
import { useFormStatus } from "react-dom"

export function AnalysisForm() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)

    const result = await analyzeRepository({
      repositoryUrl: formData.get("repositoryUrl") as string,
    })

    if (!result.ok) {
      if (result.error.code === "AUTHENTICATION_REQUIRED") {
        // Redirect to login
        window.location.href = "/login"
      } else {
        setError(result.error.message)
      }
      return
    }

    // Handle success
    console.log("Analysis complete:", result.value)
  }

  return (
    <form action={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input name="repositoryUrl" type="url" placeholder="https://github.com/owner/repo" required />
      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Analyzing..." : "Analyze Repository"}
    </button>
  )
}
```

## Testing Contracts

### Unit Test Structure

```typescript
// __tests__/actions/analyzeRepository.test.ts
import { analyzeRepository } from "@/app/actions/analyzeRepository";
import { NextAuthAdapter } from "@/infrastructure/auth/NextAuthAdapter";
import { mockSession } from "@/tests/mocks/session";

// Mock NextAuth
jest.mock("@/infrastructure/auth/auth.config", () => ({
  auth: jest.fn(),
}));

describe("analyzeRepository with OAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return AUTHENTICATION_REQUIRED when no session", async () => {
    // Mock no session
    const { auth } = require("@/infrastructure/auth/auth.config");
    auth.mockResolvedValue(null);

    const result = await analyzeRepository({
      repositoryUrl: "https://github.com/owner/repo",
    });

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should proceed with analysis when authenticated", async () => {
    // Mock authenticated session
    const { auth } = require("@/infrastructure/auth/auth.config");
    auth.mockResolvedValue(mockSession);

    const result = await analyzeRepository({
      repositoryUrl: "https://github.com/owner/repo",
    });

    // Assuming mocked API responses
    expect(result.ok).toBe(true);
  });

  it("should return TOKEN_EXPIRED when session has error", async () => {
    // Mock session with error
    const { auth } = require("@/infrastructure/auth/auth.config");
    auth.mockResolvedValue({
      ...mockSession,
      error: "RefreshAccessTokenError",
    });

    const result = await analyzeRepository({
      repositoryUrl: "https://github.com/owner/repo",
    });

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("TOKEN_EXPIRED");
  });
});
```

### E2E Test Structure

```typescript
// e2e/auth-analysis.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authenticated Repository Analysis", () => {
  test("should require authentication", async ({ page }) => {
    await page.goto("/");

    // Try to analyze without auth
    await page.fill(
      'input[name="repositoryUrl"]',
      "https://github.com/test/repo",
    );
    await page.click('button:has-text("Analyze")');

    // Should redirect to login
    await expect(page).toHaveURL("/login");
  });

  test("should analyze after OAuth sign-in", async ({ page }) => {
    // Sign in with GitHub OAuth
    await page.goto("/login");
    await page.click('button:has-text("Sign in with GitHub")');

    // GitHub OAuth flow (using test account)
    await page.fill('input[name="login"]', process.env.TEST_GITHUB_USERNAME!);
    await page.fill(
      'input[name="password"]',
      process.env.TEST_GITHUB_PASSWORD!,
    );
    await page.click('input[type="submit"]');
    await page.click('button:has-text("Authorize")');

    // Back to app, now authenticated
    await expect(page).toHaveURL("/");

    // Analyze repository
    await page.fill(
      'input[name="repositoryUrl"]',
      "https://github.com/test/repo",
    );
    await page.click('button:has-text("Analyze")');

    // Should see results
    await expect(page.locator("text=Analysis Results")).toBeVisible();
  });
});
```

## Security Considerations

### Authentication Checks

All Server Actions MUST:

1. ✅ Validate session before proceeding
2. ✅ Return `AUTHENTICATION_REQUIRED` if no session
3. ✅ Never expose `accessToken` to client
4. ✅ Use `ISessionProvider` interface (not direct `auth()` calls)
5. ✅ Log errors without token exposure (use `maskToken()`)

### Rate Limiting

Authenticated actions should implement rate limiting per user:

```typescript
// Future enhancement (not MVP)
const rateLimitResult = await checkRateLimit(session.user.id);
if (!rateLimitResult.ok) {
  return {
    ok: false,
    error: {
      code: AnalysisErrorCode.RATE_LIMIT_EXCEEDED,
      message: "Too many requests. Please try again later.",
    },
  };
}
```

## Monitoring and Observability

### Metrics to Track

| Metric                           | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `auth_check_duration_ms`         | Session validation performance          |
| `auth_required_errors`           | Users hitting unauthenticated endpoints |
| `token_expired_errors`           | Session expiry frequency                |
| `analysis_with_auth_duration_ms` | End-to-end performance impact           |

### Logging

```typescript
// Example log entries
logger.info("Server Action: analyzeRepository started", {
  repositoryUrl: request.repositoryUrl,
  hasSession: !!session,
  userId: session?.user.id,
});

logger.error("Analysis failed: authentication required", {
  repositoryUrl: request.repositoryUrl,
  // NO TOKEN IN LOGS
});
```

## Summary

The OAuth implementation modifies `analyzeRepository` to use session-based authentication:

1. ✅ **Removed**: `githubToken` parameter
2. ✅ **Added**: Internal session provider injection
3. ✅ **New errors**: `AUTHENTICATION_REQUIRED`, `TOKEN_EXPIRED`
4. ✅ **Breaking change**: Clients must authenticate before calling
5. ✅ **Performance**: Minimal overhead (<10ms auth check)
6. ✅ **Security**: Tokens never exposed to client
7. ✅ **Testability**: Mockable session provider interface

This contract ensures consistent authentication behavior across all Server Actions.
