"use server";

import { createSessionProvider } from "@/infrastructure/auth/SessionProviderFactory";
import { ok, err, type Result } from "@/lib/result";

/**
 * Server Actions for Analytics Page
 *
 * Purpose: Fetch user's repositories from GitHub API
 */

export interface Repository {
  id: number;
  name: string;
  fullName: string; // owner/repo format
  description: string | null;
  isPrivate: boolean;
  updatedAt: string;
  stargazersCount: number;
  language: string | null;
}

/**
 * Fetch user's repositories from GitHub API
 *
 * Returns repositories sorted by last updated (most recent first)
 * Includes both owned and accessible repositories
 */
export async function fetchUserRepositories(): Promise<Result<Repository[]>> {
  try {
    const sessionProvider = createSessionProvider();
    const tokenResult = await sessionProvider.getAccessToken();

    if (!tokenResult.ok) {
      return err(tokenResult.error);
    }

    const token = tokenResult.value;

    // Fetch repositories using GitHub REST API
    // Using REST API instead of GraphQL for simpler pagination
    const response = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return err(new Error("Authentication failed"));
      }
      return err(new Error(`GitHub API error: ${response.statusText}`));
    }

    const data = (await response.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      private: boolean;
      updated_at: string;
      stargazers_count: number;
      language: string | null;
    }>;

    const repositories: Repository[] = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
      stargazersCount: repo.stargazers_count,
      language: repo.language,
    }));

    return ok(repositories);
  } catch (error) {
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to fetch repositories"),
    );
  }
}

/**
 * Search repositories by name
 *
 * Searches across user's accessible repositories
 * Returns top 10 matches sorted by relevance
 */
export async function searchRepositories(
  query: string,
): Promise<Result<Repository[]>> {
  if (!query.trim()) {
    return ok([]);
  }

  try {
    const sessionProvider = createSessionProvider();
    const tokenResult = await sessionProvider.getAccessToken();

    if (!tokenResult.ok) {
      return err(tokenResult.error);
    }

    const token = tokenResult.value;

    // Search repositories using GitHub Search API
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+user:@me&sort=stars&per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return err(new Error("Authentication failed"));
      }
      return err(new Error(`GitHub API error: ${response.statusText}`));
    }

    const data = (await response.json()) as {
      items: Array<{
        id: number;
        name: string;
        full_name: string;
        description: string | null;
        private: boolean;
        updated_at: string;
        stargazers_count: number;
        language: string | null;
      }>;
    };

    const repositories: Repository[] = data.items.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
      stargazersCount: repo.stargazers_count,
      language: repo.language,
    }));

    return ok(repositories);
  } catch (error) {
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to search repositories"),
    );
  }
}
