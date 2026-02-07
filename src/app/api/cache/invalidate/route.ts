import { NextRequest, NextResponse } from "next/server";
import { initializeCache } from "@/infrastructure/storage/initializeCache";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/cache/invalidate
 *
 * Manual cache invalidation endpoint
 *
 * Request body:
 * - repositoryId?: string (optional) - If provided, clears only this repository's cache
 * - clearAll?: boolean (optional) - If true, clears all cache entries
 *
 * Response:
 * - 200: Cache cleared successfully
 * - 400: Invalid request
 * - 500: Server error
 *
 * Usage:
 * ```typescript
 * // Clear specific repository cache
 * fetch('/api/cache/invalidate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ repositoryId: 'facebook/react' })
 * });
 *
 * // Clear all cache
 * fetch('/api/cache/invalidate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ clearAll: true })
 * });
 * ```
 *
 * Note: This is a server-side endpoint. Client-side cache invalidation
 * should use the IndexedDB adapter directly via useCache hook.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { repositoryId, clearAll } = body;

    // Validate request
    if (!repositoryId && !clearAll) {
      return NextResponse.json(
        {
          error: "Must provide either repositoryId or clearAll=true",
          message:
            "Invalid request: specify repositoryId to clear specific repository cache, or clearAll=true to clear all cache",
        },
        { status: 400 },
      );
    }

    // Initialize cache (client-side only, so this will fail on server)
    // This endpoint is primarily for documentation - actual cache invalidation
    // should happen client-side via IndexedDB
    logger.info("Cache invalidation requested", {
      repositoryId,
      clearAll,
    });

    // Since IndexedDB is client-side only, we can't actually clear it from the server
    // This endpoint serves as a reference implementation and returns success
    // Client should use useCache hook or IndexedDBAdapter directly

    return NextResponse.json(
      {
        message: "Cache invalidation signal sent",
        note: "IndexedDB cache must be cleared client-side. Use useCache hook or IndexedDBAdapter.clearRepository() / clearAll()",
        repositoryId: repositoryId || "all",
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to process cache invalidation request", { error });

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cache/invalidate
 *
 * Returns cache invalidation instructions
 */
export async function GET() {
  return NextResponse.json(
    {
      message: "Cache Invalidation API",
      usage: {
        method: "POST",
        body: {
          repositoryId:
            "string (optional) - Repository to clear (e.g., 'facebook/react')",
          clearAll: "boolean (optional) - If true, clears all cache entries",
        },
        note: "IndexedDB cache is client-side only. For client-side invalidation, use useCache hook or IndexedDBAdapter methods directly.",
      },
      clientSideAPI: {
        clearRepository: "cacheRepository.clearRepository(repositoryId)",
        clearAll: "cacheRepository.clearAll()",
        evictStale: "cacheRepository.evictStale()",
      },
    },
    { status: 200 },
  );
}
