# Team Insights

Visualize GitHub repository activity to understand team dynamics. Track commits, code changes, pull requests, and review participation to improve collaboration and transparency.

## Features

- **Repository Analysis**: Analyze any GitHub repository by providing URL and access token
- **Activity Metrics**: View comprehensive metrics including:
  - Total commits and code changes per contributor
  - Pull request creation and review activity
  - Time-based activity trends
  - Contributor rankings and comparisons
- **Custom Date Ranges**: Analyze activity over specific time periods (default: last 6 months)
- **Visual Dashboard**: Interactive charts and tables for easy data exploration
- **Real-time Validation**: Immediate feedback on input validation and data quality

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **UI Components**: Radix UI + Tailwind CSS
- **Charts**: Recharts
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Code Quality**: ESLint + Prettier + Husky
- **Git Operations**: simple-git
- **GitHub API**: Octokit

## Architecture

This project follows **Clean Architecture** principles:

```
src/
├── domain/           # Business logic (entities, value objects, services)
├── application/      # Use cases and orchestration
├── infrastructure/   # External integrations (Git, GitHub API, filesystem)
└── app/             # Next.js UI (components, pages, Server Actions)
```

## Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm 8+
- GitHub Personal Access Token with `repo` scope

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd team-insights

# Install dependencies
pnpm install
```

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

## Usage

1. **Navigate to the home page** at `http://localhost:3000`

2. **Enter repository details**:
   - Repository URL (e.g., `https://github.com/vercel/next.js`)
   - GitHub Personal Access Token
   - (Optional) Custom date range for analysis

3. **View the dashboard** with:
   - Summary metrics (total contributors, commits, PRs, review comments)
   - Implementation activity chart showing code changes over time
   - Review activity rankings
   - Detailed contributor list with sortable columns

4. **Analyze another repository** using the "Analyze Another Repository" button

## GitHub Personal Access Token

To analyze repositories, you need a GitHub Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" → "Generate new token (classic)"
3. Select the `repo` scope (for private repositories) or `public_repo` (for public only)
4. Generate and copy the token

**Security**: The token is only sent to the server via Next.js Server Actions and is never exposed to the client-side JavaScript bundle.

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
│   │   ├── entities/        # Contributor, RepositoryAnalysis
│   │   ├── value-objects/   # Email, DateRange, RepositoryUrl, etc.
│   │   ├── services/        # ActivityAggregationService
│   │   ├── interfaces/      # Port interfaces (IGitOperations, IGitHubAPI)
│   │   └── types.ts         # Domain types and enums
│   ├── application/         # Application layer (use cases)
│   │   ├── use-cases/       # AnalyzeRepository, FetchGitData, CalculateMetrics
│   │   ├── dto/             # Data transfer objects
│   │   └── mappers/         # Entity to DTO mappers
│   ├── infrastructure/      # Infrastructure layer (adapters)
│   │   ├── git/             # SimpleGitAdapter, GitLogParser
│   │   ├── github/          # OctokitAdapter
│   │   └── filesystem/      # TempDirectoryManager
│   ├── app/                 # Presentation layer (Next.js App Router)
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── actions/         # Server Actions
│   │   └── page.tsx         # Routes
│   ├── components/ui/       # Shared UI components (shadcn/ui)
│   └── lib/                 # Utilities and helpers
├── tests/
│   └── e2e/                 # Playwright E2E tests
├── specs/                   # Feature specifications and planning
└── .specify/                # SpecKit configuration
```

## Environment Variables

No environment variables are required for local development. All configuration is handled through the UI or default values.

For production deployment, consider:

- `NODE_ENV=production`
- Next.js caching and optimization settings

## Performance Considerations

- **Large Repositories**: Analyzing repositories with 100+ contributors or 10+ years of history may take several minutes
- **Date Range Warnings**: The UI will warn you when selecting date ranges > 2 years that may impact performance
- **Token Rate Limits**: GitHub API has rate limits; use tokens to increase limits from 60 to 5000 requests/hour

## Known Limitations

- Server Actions process analysis synchronously; very large repositories may timeout
- Git cloning happens on the server; requires sufficient disk space
- GitHub API pagination is limited to 100 results per page
- Identity merging (User Story 3) is not yet implemented

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
