import { DateRange } from "@/domain/value-objects/DateRange";
import { GitHubGraphQLAdapter } from "@/infrastructure/github/GitHubGraphQLAdapter";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import { logger } from "@/lib/utils/logger";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  PRAnalysisClient,
  type SerializablePullRequest,
} from "@/presentation/components/analysis/PRAnalysisClient";
import {
  DeploymentFrequencyClient,
  type SerializableDeployment,
} from "@/presentation/components/analysis/DeploymentFrequencyClient";
import type { PullRequest } from "@/domain/interfaces/IGitHubRepository";
import type { DeploymentEvent } from "@/domain/value-objects/DeploymentEvent";

interface DashboardWithInitialDataProps {
  repositoryUrl: string;
  dateRange: DateRange;
}

/**
 * Convert PullRequest with Date objects to serializable format
 * (Server Component → Client Component requires plain objects only)
 */
function serializePullRequest(pr: PullRequest): SerializablePullRequest {
  return {
    number: pr.number,
    title: pr.title,
    author: pr.author,
    createdAt: pr.createdAt.toISOString(),
    state: pr.state,
    reviewCommentCount: pr.reviewCommentCount,
    mergedAt: pr.mergedAt?.toISOString(),
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
  };
}

/**
 * Convert DeploymentEvent class instance to serializable format
 * (Server Component → Client Component requires plain objects only)
 */
function serializeDeployment(
  deployment: DeploymentEvent,
): SerializableDeployment {
  return {
    id: deployment.id,
    tagName: deployment.tagName,
    timestamp: deployment.timestamp.toISOString(),
    source: deployment.source,
    environment: deployment.environment,
    displayName: deployment.displayName,
  };
}

/**
 * Server Component that fetches initial data using LoadInitialData use case
 *
 * This component demonstrates the progressive loading pattern:
 * 1. Server Component fetches initial data (30 days or custom range)
 * 2. Data is passed as props to Client Components
 * 3. Client Components can load additional data in background (Phase 4)
 *
 * Performance targets:
 * - Cache hit (fresh): <1s
 * - Cache hit (stale): <1s initial + background refresh
 * - Cache miss: <5s (parallel API fetches)
 */
export async function DashboardWithInitialData({
  repositoryUrl,
  dateRange,
}: DashboardWithInitialDataProps) {
  try {
    logger.info("DashboardWithInitialData", "Loading initial data", {
      repositoryUrl,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
    });

    // Extract owner and repo from URL
    const { owner, repo } = parseRepositoryUrl(repositoryUrl);
    const repositoryId = `${owner}/${repo}`;

    // Initialize infrastructure dependencies
    const sessionProvider = createSessionProvider();
    const githubAdapter = new GitHubGraphQLAdapter(sessionProvider);

    // Fetch data from GitHub API (no cache in Server Component)
    // Note: IndexedDB is client-side only, so Server Components bypass cache
    const [prsResult, deploymentsResult, commitsResult] = await Promise.all([
      githubAdapter.fetchPRs(repositoryId, dateRange),
      githubAdapter.fetchDeployments(repositoryId, dateRange),
      githubAdapter.fetchCommits(repositoryId, dateRange),
    ]);

    // Check for errors
    if (!prsResult.ok) {
      logger.error("Failed to fetch PRs", { error: prsResult.error });
      return (
        <div className="min-h-screen p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load pull requests</AlertTitle>
            <AlertDescription>{prsResult.error.message}</AlertDescription>
          </Alert>
        </div>
      );
    }

    // Extract results (deployments and commits are optional)
    const pullRequests = prsResult.value;
    const deployments = deploymentsResult.ok ? deploymentsResult.value : [];
    const commits = commitsResult.ok ? commitsResult.value : [];

    logger.info("DashboardWithInitialData", "Initial data loaded", {
      pullRequestsCount: pullRequests.length,
      deploymentsCount: deployments.length,
      commitsCount: commits.length,
    });

    // Convert to serializable format for Client Components
    // (Server → Client requires plain objects, no Date or class instances)
    const serializedPRs = pullRequests.map(serializePullRequest);
    const serializedDeployments = deployments.map(serializeDeployment);

    // Render Client Components with initial data from Server Component
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Progressive Loading Dashboard
            </h1>
            <p className="text-muted-foreground">Repository: {repositoryId}</p>
            <p className="text-sm text-muted-foreground">
              {dateRange.start.toLocaleDateString()} -{" "}
              {dateRange.end.toLocaleDateString()} ({dateRange.durationInDays}{" "}
              days)
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-900 dark:text-green-100">
              <strong>✓ Phase 3 Complete:</strong> Server Component → Client
              Component data flow active
            </p>
          </div>

          {/* PR Analysis Client Component */}
          <PRAnalysisClient
            initialData={serializedPRs}
            repositoryId={repositoryId}
          />

          {/* Deployment Frequency Client Component */}
          <DeploymentFrequencyClient
            initialData={serializedDeployments}
            repositoryId={repositoryId}
          />

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-2">
              What&apos;s Next (Phase 4):
            </p>
            <ul className="text-sm text-blue-900 dark:text-blue-100 space-y-1 list-disc list-inside">
              <li>Background historical data loading with useTransition</li>
              <li>IndexedDB caching on client side</li>
              <li>Stale-while-revalidate pattern</li>
              <li>Non-blocking UI updates during background loading</li>
            </ul>
          </div>

          {commits.length > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium mb-2">
                Commits ({commits.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Commit data loaded but not yet displayed in Phase 3
              </p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    logger.error("Unexpected error in DashboardWithInitialData", { error });
    return (
      <div className="min-h-screen p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unexpected Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}

/**
 * Parse repository URL to extract owner and repo
 *
 * Supports formats:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
function parseRepositoryUrl(url: string): { owner: string; repo: string } {
  // Remove protocol and domain if present
  const cleanUrl = url
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "");

  // Extract owner and repo
  const parts = cleanUrl.split("/");
  if (parts.length < 2) {
    throw new Error(`Invalid repository URL: ${url}`);
  }

  return {
    owner: parts[0]!,
    repo: parts[1]!.replace(/\.git$/, ""), // Remove .git suffix if present
  };
}
