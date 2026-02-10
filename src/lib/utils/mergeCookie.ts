import { cookies } from "next/headers";

/**
 * Merge preference stored in cookie
 */
export interface MergePreference {
  primaryId: string;
  mergedIds: string[];
  timestamp: string;
}

/**
 * Cookie name for storing merge preferences
 */
const MERGE_COOKIE_NAME = "identity-merges";

/**
 * Max age for merge cookie (30 days)
 */
const MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Get merge preferences for a repository from cookie
 */
export async function getMergePreferences(
  repositoryId: string,
): Promise<MergePreference[]> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(MERGE_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return [];
  }

  try {
    const allMerges = JSON.parse(cookieValue) as Record<
      string,
      MergePreference[]
    >;
    return allMerges[repositoryId] || [];
  } catch {
    return [];
  }
}

/**
 * Save merge preference to cookie
 */
export async function saveMergePreference(
  repositoryId: string,
  preference: MergePreference,
): Promise<void> {
  const cookieStore = await cookies();
  const existingValue = cookieStore.get(MERGE_COOKIE_NAME)?.value;

  let allMerges: Record<string, MergePreference[]> = {};

  if (existingValue) {
    try {
      allMerges = JSON.parse(existingValue);
    } catch {
      // Invalid JSON, start fresh
      allMerges = {};
    }
  }

  // Add new merge to repository's list
  if (!allMerges[repositoryId]) {
    allMerges[repositoryId] = [];
  }
  allMerges[repositoryId].push(preference);

  // Save back to cookie
  cookieStore.set(MERGE_COOKIE_NAME, JSON.stringify(allMerges), {
    maxAge: MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Clear merge preferences for a repository
 */
export async function clearMergePreferences(
  repositoryId: string,
): Promise<void> {
  const cookieStore = await cookies();
  const existingValue = cookieStore.get(MERGE_COOKIE_NAME)?.value;

  if (!existingValue) {
    return;
  }

  try {
    const allMerges = JSON.parse(existingValue) as Record<
      string,
      MergePreference[]
    >;
    delete allMerges[repositoryId];

    if (Object.keys(allMerges).length === 0) {
      cookieStore.delete(MERGE_COOKIE_NAME);
    } else {
      cookieStore.set(MERGE_COOKIE_NAME, JSON.stringify(allMerges), {
        maxAge: MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
  } catch {
    // Invalid JSON, just delete the cookie
    cookieStore.delete(MERGE_COOKIE_NAME);
  }
}
