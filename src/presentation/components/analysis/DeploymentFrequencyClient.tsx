"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBackgroundLoader } from "@/presentation/hooks/useBackgroundLoader";
import { LoadingIndicator } from "@/presentation/components/shared/LoadingIndicator";
import { DateRange } from "@/domain/value-objects/DateRange";
import { DataType } from "@/domain/types/DataType";
import {
  DeploymentEvent,
  type DeploymentSource,
} from "@/domain/value-objects/DeploymentEvent";
import { GitHubGraphQLAdapter } from "@/infrastructure/github/GitHubGraphQLAdapter";
import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import { initializeCache } from "@/infrastructure/storage/initializeCache";
import type { ICacheRepository } from "@/domain/interfaces/ICacheRepository";

/**
 * Serializable deployment data for Client Component
 * (DeploymentEvent class instances cannot be passed from Server to Client)
 */
export interface SerializableDeployment {
  id: string;
  tagName: string | null;
  timestamp: string; // ISO string instead of Date
  source: DeploymentSource; // Use proper type instead of string
  environment?: string;
  displayName: string;
}

export interface DeploymentFrequencyClientProps {
  /** Initial deployment data from Server Component (serialized) */
  initialData: SerializableDeployment[];
  /** Repository identifier (owner/repo) */
  repositoryId: string;
  /** Date range of initial data (for calculating historical range) */
  dateRange?: { start: string; end: string };
}

/**
 * Deserialize deployment data (convert to DeploymentEvent instances)
 */
function deserializeDeployment(
  deployment: SerializableDeployment,
): DeploymentEvent {
  return DeploymentEvent.create(
    deployment.id,
    deployment.tagName,
    new Date(deployment.timestamp),
    deployment.source,
    deployment.environment,
    deployment.displayName,
  );
}

/**
 * Deployment Frequency Client Component
 *
 * This component receives initial deployment data from a Server Component and displays it.
 * Phase 4: Loads historical data in the background using useTransition.
 *
 * Progressive loading strategy:
 * - Phase 3: Display initial data passed from Server Component
 * - Phase 4: Load historical data (31-365 days) in background using useTransition
 *
 * Performance targets:
 * - Initial render: <100ms (data already loaded by Server Component)
 * - Background loading: Non-blocking, doesn't freeze UI
 * - Historical load: <30s for 1 year of data (chunked batches)
 */
export function DeploymentFrequencyClient({
  initialData,
  repositoryId,
  dateRange,
}: DeploymentFrequencyClientProps) {
  const t = useTranslations("progressiveLoading");
  const [cacheRepository, setCacheRepository] =
    useState<ICacheRepository | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);

  // Deserialize initial data
  const deserializedInitialData = useMemo(
    () => initialData.map(deserializeDeployment),
    [initialData],
  );

  // Calculate historical range (31 days ago to 1 year ago)
  const historicalRange = useMemo(() => {
    if (dateRange) {
      // If we have the initial range, calculate historical from before it
      const initialEnd = new Date(dateRange.end);
      const historicalEnd = new Date(initialEnd);
      historicalEnd.setDate(historicalEnd.getDate() - 1); // Day before initial range

      const historicalStart = new Date(initialEnd);
      historicalStart.setDate(historicalStart.getDate() - 365); // 1 year before

      const result = DateRange.create(historicalStart, historicalEnd);
      return result.ok ? result.value : null;
    } else {
      // Fallback: assume initial data is last 30 days, load 31-365 days
      const now = new Date();
      const thirtyOneDaysAgo = new Date(now);
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const oneYearAgo = new Date(now);
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const result = DateRange.create(oneYearAgo, thirtyOneDaysAgo);
      return result.ok ? result.value : null;
    }
  }, [dateRange]);

  // Initialize cache on mount
  useEffect(() => {
    let mounted = true;

    async function initCache() {
      const result = await initializeCache();

      if (mounted) {
        const cache = result.success ? result.adapter : result.fallback;
        setCacheRepository(cache);
        setCacheInitialized(true);

        if (!result.success) {
          console.warn(
            `Cache initialization warning: ${result.reason}, using fallback`,
          );
        }
      }
    }

    initCache();

    return () => {
      mounted = false;
    };
  }, []);

  // Create data loader (client-side session provider)
  const dataLoader = useMemo(() => {
    const sessionProvider = createSessionProvider();
    return new GitHubGraphQLAdapter(sessionProvider);
  }, []);

  // Use background loader hook
  const { data, state } = useBackgroundLoader<DeploymentEvent>({
    repositoryId,
    dataType: DataType.DEPLOYMENTS,
    historicalRange: historicalRange ?? DateRange.last90Days(),
    initialData: deserializedInitialData,
    dataLoader,
    cacheRepository: cacheRepository ?? undefined,
    autoStart: cacheInitialized && historicalRange !== null,
  });

  // Calculate stats from combined data
  const totalDeployments = data.length;
  const environments = Array.from(
    new Set(data.map((d) => d.environment).filter(Boolean)),
  );

  // Sort deployments by timestamp (newest first) for display
  const sortedDeployments = useMemo(
    () =>
      [...data].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [data],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Deployment Frequency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Phase 4 Status */}
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-900 dark:text-green-100">
                <strong>✓ {t("phase4.active")}</strong>
              </p>
            </div>

            {/* Loading Indicator */}
            {state.isLoading && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <LoadingIndicator
                  progress={state.progress}
                  showProgress={true}
                />
              </div>
            )}

            {/* Success Indicator */}
            {state.isComplete && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-900 dark:text-emerald-100">
                  <strong>
                    ✓{" "}
                    {t("phase4.successIndicator.loaded", {
                      total: data.length,
                      dataType: t(
                        "phase4.successIndicator.dataType.deployments",
                      ),
                      initial: initialData.length,
                    })}
                  </strong>
                </p>
              </div>
            )}

            {/* Error Display */}
            {state.error && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-900 dark:text-red-100">
                  <strong>{t("error")}:</strong> {state.error}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  {t("stats.totalDeployments")}
                </h3>
                <p className="text-2xl font-bold">{totalDeployments}</p>
                {state.isComplete && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("phase4.successIndicator.additional", {
                      count: totalDeployments - initialData.length,
                    })}
                  </p>
                )}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  {t("stats.environments")}
                </h3>
                <p className="text-2xl font-bold">{environments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {environments.join(", ") || "None"}
                </p>
              </div>
            </div>

            {/* Repository Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium mb-2">{t("repository")}</h3>
              <p className="text-sm text-muted-foreground">{repositoryId}</p>
            </div>

            {/* Recent Deployments */}
            {sortedDeployments.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  {t("recentDeployments")}
                </h3>
                <ul className="space-y-2">
                  {sortedDeployments.slice(0, 5).map((deployment, idx) => (
                    <li
                      key={deployment.id || idx}
                      className="text-sm p-2 bg-background rounded"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {deployment.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {deployment.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {deployment.source}
                        {deployment.environment &&
                          ` • ${deployment.environment}`}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
