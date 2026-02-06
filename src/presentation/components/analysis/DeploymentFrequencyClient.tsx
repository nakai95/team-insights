"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Serializable deployment data for Client Component
 * (DeploymentEvent class instances cannot be passed from Server to Client)
 */
export interface SerializableDeployment {
  id: string;
  tagName: string | null;
  timestamp: string; // ISO string instead of Date
  source: string;
  environment?: string;
  displayName: string;
}

export interface DeploymentFrequencyClientProps {
  /** Initial deployment data from Server Component (serialized) */
  initialData: SerializableDeployment[];
  /** Repository identifier (owner/repo) */
  repositoryId: string;
}

/**
 * Deployment Frequency Client Component
 *
 * This component receives initial deployment data from a Server Component and displays it.
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
export function DeploymentFrequencyClient({
  initialData,
  repositoryId,
}: DeploymentFrequencyClientProps) {
  // Calculate simple statistics
  const totalDeployments = initialData.length;
  const environments = Array.from(
    new Set(initialData.map((d) => d.environment)),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Deployment Frequency Analysis (Phase 3 Demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-900 dark:text-green-100">
                <strong>✓ Client Component Pattern:</strong> Receiving initial
                data from Server Component
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">Total Deployments</h3>
                <p className="text-2xl font-bold">{totalDeployments}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">Environments</h3>
                <p className="text-2xl font-bold">{environments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {environments.join(", ") || "None"}
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
                  Recent Deployments (First 5)
                </h3>
                <ul className="space-y-2">
                  {initialData.slice(0, 5).map((deployment, idx) => (
                    <li
                      key={deployment.id || idx}
                      className="text-sm p-2 bg-background rounded"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {deployment.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(deployment.timestamp).toLocaleDateString()}
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
