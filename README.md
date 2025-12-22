# Team Insights

Visualize GitHub repository activity to understand team dynamics. Track commits, code changes, pull requests, and review participation to improve collaboration and transparency.

## Features

- **GitHub OAuth Authentication**: Secure sign-in with your GitHub account (no manual token management)
- **Repository Analysis**: Analyze any GitHub repository with authenticated access
- **Activity Metrics**: View comprehensive metrics including:
  - Total commits and code changes per contributor
  - Pull request creation and review activity
  - Time-based activity trends
  - Contributor rankings and comparisons
- **Identity Merging**: Merge duplicate contributor identities that represent the same person
  - Interactive UI for selecting contributors to merge
  - Preview merged metrics before confirming
  - Aggregate implementation and review activity across identities
- **Custom Date Ranges**: Analyze activity over specific time periods (default: last 6 months)
- **Visual Dashboard**: Interactive charts and tables for easy data exploration
- **Real-time Validation**: Immediate feedback on input validation and data quality
- **Session Management**: Persistent authentication with 7-day session expiry

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Authentication**: NextAuth.js v5 (OAuth 2.0)
- **UI Components**: Radix UI + Tailwind CSS
- **Charts**: Recharts
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Code Quality**: ESLint + Prettier + Husky
- **GitHub API**: Octokit (unified repository operations)

## Architecture

This project follows **Clean Architecture** principles:

```
src/
├── domain/           # Business logic (entities, value objects, services)
├── application/      # Use cases and orchestration
├── infrastructure/   # External integrations (GitHub API, storage)
└── app/             # Next.js UI (components, pages, Server Actions)
```

## Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm 8+
- GitHub OAuth Application (see setup instructions below)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd team-insights

# Install dependencies
pnpm install
```

## GitHub OAuth Setup

Before running the application, you need to create a GitHub OAuth application:

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in the application details:
   - **Application name**: Team Insights (Development)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy the **Client Secret**

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# GitHub OAuth Credentials
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# Session Encryption Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your_32_character_secret_key
```

**Generate AUTH_SECRET**:

```bash
openssl rand -base64 32
```

**Security Notes**:

- Never commit `.env.local` to version control
- Use different OAuth apps for development and production
- Keep your `AUTH_SECRET` secure and rotate it periodically

### 3. Required GitHub OAuth Scopes

The application requests the following scopes:

- `read:user` - Read user profile information
- `user:email` - Access user email addresses
- `repo` - Access to public and private repositories

## Getting Started

### Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
pnpm build
pnpm start
```

**Production OAuth Setup**:

1. Create a separate GitHub OAuth app for production
2. Update callback URL to your production domain: `https://yourdomain.com/api/auth/callback/github`
3. Set environment variables in your hosting platform

## Usage

1. **Sign in with GitHub**:
   - Visit `http://localhost:3000`
   - Click "Sign in with GitHub"
   - Authorize the application to access your repositories
   - You'll be redirected back with an active session

2. **Analyze a repository**:
   - Enter a repository URL (e.g., `https://github.com/vercel/next.js`)
   - (Optional) Select a custom date range for analysis
   - Click "Analyze Repository"
   - No need to enter a personal access token - authentication is handled automatically

3. **View the dashboard** with:
   - Summary metrics (total contributors, commits, PRs, review comments)
   - Implementation activity chart showing code changes over time
   - Review activity rankings
   - Detailed contributor list with sortable columns

4. **Merge duplicate identities** (optional):
   - Click "Merge Identities" button
   - Select contributors that represent the same person
   - Choose a primary identity to preserve
   - Review the merged metrics preview
   - Confirm to merge and update the dashboard

5. **Session management**:
   - Your session persists for 7 days with automatic activity-based extension
   - Click "Sign out" in the header to end your session
   - Sessions are encrypted and stored securely

6. **Analyze another repository** using the "Analyze Another Repository" button

## Authentication & Security

This application uses GitHub OAuth 2.0 for secure authentication:

- **No manual token management**: Authentication is handled automatically via OAuth
- **Server-side tokens**: Access tokens are never exposed to the browser
- **Encrypted sessions**: JWT-based sessions encrypted with `AUTH_SECRET`
- **Secure cookies**: HTTP-only, Secure (in production), SameSite=Lax
- **Token masking**: All tokens are masked in logs to prevent exposure
- **7-day sessions**: Automatic expiry with activity-based extension

**What happens to your data**:

- OAuth tokens are stored in encrypted JWT cookies
- Tokens are only used server-side to access GitHub API
- No tokens or sensitive data are sent to the client
- Sessions expire after 7 days of inactivity

## Testing

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode
pnpm test:e2e:ui
```

### Test Coverage

Current test coverage (domain layer):

- **Entities**: 98.21%
- **Value Objects**: 95.45%
- **Domain Services**: 96.07%
- **Overall**: 155 tests passing

## Code Quality

```bash
# Lint check
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm type-check
```

### Pre-commit Hooks

This project uses Husky and lint-staged to ensure code quality:

- Auto-formatting with Prettier
- Linting with ESLint
- Type checking
- Running tests related to changed files

## Project Structure

```
team-insights/
├── src/
│   ├── domain/              # Domain layer (business logic)
│   │   ├── entities/        # Contributor, RepositoryAnalysis, IdentityMerge
│   │   ├── value-objects/   # Email, DateRange, RepositoryUrl, etc.
│   │   ├── services/        # ActivityAggregationService, ContributorService
│   │   ├── interfaces/      # Port interfaces (IGitHubRepository, IStoragePort, ISessionProvider)
│   │   └── types.ts         # Domain types and enums
│   ├── application/         # Application layer (use cases)
│   │   ├── use-cases/       # AnalyzeRepository, FetchGitData, CalculateMetrics, MergeIdentities
│   │   ├── dto/             # Data transfer objects
│   │   └── mappers/         # Entity to DTO mappers
│   ├── infrastructure/      # Infrastructure layer (adapters)
│   │   ├── github/          # OctokitAdapter, RateLimiter
│   │   ├── storage/         # LocalStorageAdapter
│   │   └── session/         # NextAuthSessionProvider
│   ├── presentation/        # Presentation layer (React components & hooks)
│   │   ├── components/      # IdentityMerger, etc.
│   │   └── hooks/           # useIdentityMerge
│   ├── app/                 # Next.js App Router
│   │   ├── components/      # Dashboard, AnalysisForm
│   │   ├── actions/         # Server Actions (analyzeRepository, mergeIdentities)
│   │   └── page.tsx         # Routes
│   ├── components/ui/       # Shared UI components (shadcn/ui)
│   └── lib/                 # Utilities and helpers
├── tests/
│   └── e2e/                 # Playwright E2E tests
├── specs/                   # Feature specifications and planning
└── .specify/                # SpecKit configuration
```

## Environment Variables

### Required for Development and Production

```bash
# GitHub OAuth Configuration
AUTH_GITHUB_ID=<your_github_oauth_client_id>
AUTH_GITHUB_SECRET=<your_github_oauth_client_secret>

# Session Encryption (min 32 characters)
AUTH_SECRET=<generated_with_openssl_rand_base64_32>

# Optional: Base URL (auto-detected in development)
NEXTAUTH_URL=http://localhost:3000
```

### Production Deployment

For production deployment, ensure you:

1. Create a separate GitHub OAuth app with production callback URL
2. Set all required environment variables in your hosting platform
3. Use a strong, unique `AUTH_SECRET` (different from development)
4. Set `NODE_ENV=production`
5. Enable HTTPS for secure cookie transmission

## Performance Considerations

- **Large Repositories**: Analyzing repositories with 100+ contributors or 10+ years of history may take several minutes due to GitHub API pagination
- **Date Range Warnings**: The UI will warn you when selecting date ranges > 2 years that may impact performance
- **GitHub API Rate Limits**: OAuth tokens provide 5000 requests/hour; the application automatically handles rate limiting and delays requests when necessary
- **Serverless Execution**: Analysis runs in serverless functions with built-in timeouts; very large repositories may require optimization

## Known Limitations

- Server Actions process analysis synchronously; very large repositories may timeout in serverless environment
- GitHub API pagination requires one request per commit for detailed file changes, which can be slow for large repositories
- Rate limiting may cause delays when analyzing repositories with extensive history
- Identity merge preferences are session-only (not persisted across page reloads)

## Contributing

This project follows Clean Architecture and Domain-Driven Design principles:

1. **Domain First**: Start with domain entities and value objects
2. **Test-Driven**: Write tests before implementation
3. **Dependency Rule**: Dependencies point inward (domain has no dependencies)
4. **Explicit Error Handling**: Use Result types instead of throwing exceptions

### Development Workflow

1. Create a feature branch from `main`
2. Implement following the Clean Architecture layers
3. Write unit tests (aim for 80%+ coverage on domain layer)
4. Write E2E tests for user-facing features
5. Run `pnpm lint` and `pnpm type-check`
6. Create a pull request

## License

Private project - All rights reserved

## Support

For issues or questions, please open an issue in the repository.
