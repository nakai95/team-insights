# Migration Guide: GitHub OAuth Authentication

**Version**: 2.0.0
**Date**: 2025-12-21
**Breaking Change**: Replaced manual GitHub token input with OAuth 2.0 authentication

## Overview

This release replaces the manual GitHub Personal Access Token (PAT) input method with GitHub OAuth 2.0 authentication. Users now authenticate via "Sign in with GitHub" instead of manually entering tokens.

## What Changed

### Before (v1.x)

```typescript
// Users manually provided GitHub token via form input
<AnalysisForm>
  <input name="repositoryUrl" />
  <input name="githubToken" />  // ❌ REMOVED
  <button>Analyze</button>
</AnalysisForm>

// Server Action accepted token as parameter
export async function analyzeRepository(request: {
  repositoryUrl: string;
  githubToken: string;  // ❌ REMOVED
  dateRange?: DateRange;
}): Promise<Result<AnalysisResult, AnalysisError>>
```

### After (v2.x)

```typescript
// Users authenticate with OAuth before analyzing
<SignInButton />  // ✅ NEW

// Form no longer requires token input
<AnalysisForm>
  <input name="repositoryUrl" />
  <button>Analyze</button>
</AnalysisForm>

// Server Action retrieves token from session
export async function analyzeRepository(request: {
  repositoryUrl: string;
  dateRange?: DateRange;
}): Promise<Result<AnalysisResult, AnalysisError>>
```

## Breaking Changes

### 1. Removed: `githubToken` parameter from `AnalysisRequest`

**Impact**: Any code calling `analyzeRepository` Server Action must be updated

**Before**:

```typescript
const result = await analyzeRepository({
  repositoryUrl: "https://github.com/owner/repo",
  githubToken: "ghp_xxxxxxxxxxxxx", // ❌ No longer accepted
  dateRange: { start: "2024-01-01", end: "2024-12-31" },
});
```

**After**:

```typescript
// User must be authenticated first
const result = await analyzeRepository({
  repositoryUrl: "https://github.com/owner/repo",
  dateRange: { start: "2024-01-01", end: "2024-12-31" },
});
```

### 2. New: Authentication Required

**Impact**: All users must sign in with GitHub before analyzing repositories

**Authentication Flow**:

1. User visits the application
2. User clicks "Sign in with GitHub"
3. User authorizes the application on GitHub
4. User is redirected back with an active session
5. User can now analyze repositories (token retrieved from session)

### 3. New: Environment Variables Required

**Impact**: Developers and deployment teams must configure OAuth credentials

**Required Variables**:

```bash
AUTH_GITHUB_ID=<github_oauth_client_id>
AUTH_GITHUB_SECRET=<github_oauth_client_secret>
AUTH_SECRET=<32_character_encryption_key>
```

See [OAuth Setup Instructions](#oauth-setup-instructions) below.

### 4. Changed: Error Handling

**Impact**: New error codes for authentication failures

**New Error Codes**:

- `AUTHENTICATION_REQUIRED`: No active session (user must sign in)
- `TOKEN_EXPIRED`: Session expired (user must re-authenticate)

**Example Error Handling**:

```typescript
const result = await analyzeRepository(request);

if (!result.ok) {
  switch (result.error.code) {
    case AnalysisErrorCode.AUTHENTICATION_REQUIRED:
      // Redirect to login
      redirect("/login");
      break;
    case AnalysisErrorCode.TOKEN_EXPIRED:
      // Show re-authentication prompt
      toast.error("Session expired. Please sign in again.");
      break;
    // ... other error codes
  }
}
```

## Migration Steps

### For Users

1. **First-time setup**: No action required - sign in with GitHub when prompted
2. **Existing users**: Your saved tokens are no longer used - sign in with GitHub instead
3. **Session management**: Sessions persist for 7 days - sign out when finished

### For Developers

#### 1. Set up GitHub OAuth Application

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" → "New OAuth App"
3. Configure:
   - **Application name**: Team Insights (Development)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret

#### 2. Update Environment Configuration

Create or update `.env.local`:

```bash
# GitHub OAuth Credentials
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# Generate with: openssl rand -base64 32
AUTH_SECRET=your_32_character_secret_key
```

#### 3. Update Dependencies

```bash
pnpm install
```

New dependency: `next-auth@beta` (NextAuth.js v5)

#### 4. Update Code (if using Server Actions directly)

**Before**:

```typescript
// Client-side code
const [token, setToken] = useState("");

const handleSubmit = async (url: string) => {
  const result = await analyzeRepository({
    repositoryUrl: url,
    githubToken: token, // ❌ Remove this
  });
};
```

**After**:

```typescript
// Client-side code - no token needed
const handleSubmit = async (url: string) => {
  const result = await analyzeRepository({
    repositoryUrl: url,
    // Token retrieved from session automatically
  });
};
```

#### 5. Update Tests

Tests that mock GitHub token input should be updated:

**Before**:

```typescript
await analyzeRepository({
  repositoryUrl: "https://github.com/test/repo",
  githubToken: "mock_token", // ❌ Remove
});
```

**After**:

```typescript
// Mock session provider instead
const mockSessionProvider = new MockSessionProvider("mock_token");

await analyzeRepository({
  repositoryUrl: "https://github.com/test/repo",
});
```

### For Production Deployments

#### 1. Create Production OAuth App

1. Create a **separate** GitHub OAuth app for production
2. Set callback URL to your production domain: `https://yourdomain.com/api/auth/callback/github`

#### 2. Configure Environment Variables

Set the following in your hosting platform:

```bash
AUTH_GITHUB_ID=<production_client_id>
AUTH_GITHUB_SECRET=<production_client_secret>
AUTH_SECRET=<production_secret_key>  # Different from development
NODE_ENV=production
```

#### 3. Security Checklist

- ✅ Use HTTPS in production (required for secure cookies)
- ✅ Use a unique `AUTH_SECRET` (min 32 characters)
- ✅ Never commit `.env.local` or expose secrets
- ✅ Rotate `AUTH_SECRET` periodically
- ✅ Monitor session activity and failed authentications

## OAuth Setup Instructions

### Development Environment

```bash
# 1. Create GitHub OAuth App
# Visit: https://github.com/settings/developers

# 2. Generate AUTH_SECRET
openssl rand -base64 32

# 3. Create .env.local
cat > .env.local <<EOF
AUTH_GITHUB_ID=your_dev_client_id
AUTH_GITHUB_SECRET=your_dev_client_secret
AUTH_SECRET=$(openssl rand -base64 32)
EOF

# 4. Start development server
pnpm dev
```

### Production Environment

```bash
# 1. Create separate OAuth app with production callback URL
# Callback: https://yourdomain.com/api/auth/callback/github

# 2. Set environment variables in hosting platform
AUTH_GITHUB_ID=your_prod_client_id
AUTH_GITHUB_SECRET=your_prod_client_secret
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://yourdomain.com

# 3. Deploy application
```

## Benefits of OAuth Authentication

### For Users

- ✅ No manual token management
- ✅ No risk of exposing personal tokens
- ✅ Automatic token expiration and renewal
- ✅ Clear authorization scopes
- ✅ Easy sign-out

### For Developers

- ✅ Server-side token management
- ✅ Encrypted session storage
- ✅ No tokens in client-side code
- ✅ Centralized authentication logic
- ✅ Better security practices

## Rollback Plan

If you need to temporarily rollback to manual token input:

1. Check out the previous version: `git checkout v1.x`
2. Reinstall dependencies: `pnpm install`
3. Remove OAuth environment variables from `.env.local`
4. Restart the development server

**Note**: Rolling back is not recommended for production as v2.x provides better security.

## Support

If you encounter issues during migration:

1. Check the [README.md](README.md) for complete setup instructions
2. Review the [GitHub OAuth documentation](https://docs.github.com/en/apps/oauth-apps)
3. Verify environment variables are correctly set
4. Check server logs for authentication errors
5. Open an issue in the repository

## FAQ

**Q: Can I still use personal access tokens?**
A: No, manual token input has been removed. Use OAuth authentication instead.

**Q: How long do sessions last?**
A: Sessions persist for 7 days with automatic activity-based extension (24-hour rolling window).

**Q: What happens to my old tokens?**
A: Old tokens stored in browser state are no longer used. Sign in with OAuth instead.

**Q: Do I need to create separate OAuth apps for dev and prod?**
A: Yes, it's recommended to use separate OAuth apps with different callback URLs for security.

**Q: What scopes does the application request?**
A: `read:user`, `user:email`, and `repo` (full repository access including private repos).

**Q: Can I revoke access?**
A: Yes, visit [GitHub Settings → Applications](https://github.com/settings/applications) to revoke access at any time.

**Q: Are tokens exposed to the browser?**
A: No, OAuth tokens are stored server-side in encrypted JWT cookies and never sent to the client.

## Version History

- **v2.0.0** (2025-12-21): Introduced GitHub OAuth authentication (breaking change)
- **v1.x**: Manual GitHub Personal Access Token input (deprecated)
