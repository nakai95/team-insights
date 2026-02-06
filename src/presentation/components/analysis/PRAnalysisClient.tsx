"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Serializable PR data for Client Component
 * (Date objects cannot be passed from Server to Client)
 */
export interface SerializablePullRequest {
  number: number;
  title: string;
  author: string;
  createdAt: string; // ISO string instead of Date
  state: "open" | "closed" | "merged";
  reviewCommentCount: number;
  mergedAt?: string; // ISO string instead of Date
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface PRAnalysisClientProps {
  /** Initial PR data from Server Component (serialized) */
  initialData: SerializablePullRequest[];
  /** Repository identifier (owner/repo) */
  repositoryId: string;
}

/**
 * PR Analysis Client Component
 *
 * This component receives initial PR data from a Server Component and displays it.
 * In Phase 4, this component will also load historical data in the background.
 *
 * Progressive loading strategy:
 * - Phase 3: Display initial data passed from Server Component
 * - Phase 4: Load historical data in background using useTransition
 *
 * Performance targets:
 * - Initial render: <100ms (data already loaded by Server Component)
 * - Background loading: Non-blocking, doesn't freeze UI
 */
export function PRAnalysisClient({
  initialData,
  repositoryId,
}: PRAnalysisClientProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pull Requests Analysis (Phase 3 Demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-900 dark:text-green-100">
                <strong>✓ Client Component Pattern:</strong> Receiving initial
                data from Server Component
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">Total PRs</h3>
                <p className="text-2xl font-bold">{initialData.length}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">Merged PRs</h3>
                <p className="text-2xl font-bold">
                  {initialData.filter((pr) => pr.state === "merged").length}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">Open PRs</h3>
                <p className="text-2xl font-bold">
                  {initialData.filter((pr) => pr.state === "open").length}
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium mb-2">Repository</h3>
              <p className="text-sm text-muted-foreground">{repositoryId}</p>
            </div>

            {initialData.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">
                  Recent PRs (First 5)
                </h3>
                <ul className="space-y-2">
                  {initialData.slice(0, 5).map((pr) => (
                    <li
                      key={pr.number}
                      className="text-sm p-2 bg-background rounded"
                    >
                      <span className="font-medium">#{pr.number}</span> -{" "}
                      {pr.title}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({pr.state})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Phase 4:</strong> This component will load historical
                data in the background using React 18&apos;s useTransition
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
