import { RateLimitInfo } from "@/domain/interfaces/IGitHubAPI";
import { logger } from "@/lib/utils/logger";

/**
 * Rate limiter for GitHub API requests
 * Tracks rate limit status and delays requests when necessary
 */
export class RateLimiter {
  private rateLimitInfo: RateLimitInfo | null = null;
  private requestCount = 0;

  /**
   * Update rate limit information
   * Should be called after each API request to track current status
   */
  updateRateLimit(rateLimitInfo: RateLimitInfo): void {
    this.rateLimitInfo = rateLimitInfo;
    this.requestCount++;

    logger.debug("Rate limit updated", {
      remaining: rateLimitInfo.remaining,
      limit: rateLimitInfo.limit,
      resetAt: rateLimitInfo.resetAt.toISOString(),
      requestCount: this.requestCount,
    });
  }

  /**
   * Check if we should delay the next request
   * Returns delay in milliseconds, or 0 if no delay needed
   */
  getDelay(): number {
    if (!this.rateLimitInfo) {
      return 0; // No rate limit info yet
    }

    const { remaining, resetAt } = this.rateLimitInfo;

    // If we have plenty of requests remaining, no delay
    if (remaining > 100) {
      return 0;
    }

    // If we're running low on requests, calculate delay
    if (remaining > 0) {
      // Calculate time until reset
      const now = new Date();
      const msUntilReset = resetAt.getTime() - now.getTime();

      if (msUntilReset <= 0) {
        return 0; // Reset time has passed
      }

      // If we have very few requests left, add a proportional delay
      if (remaining <= 10) {
        // Distribute remaining requests evenly over time until reset
        const delayPerRequest = Math.floor(msUntilReset / (remaining + 1));
        logger.warn("Rate limit running low, adding delay", {
          remaining,
          delayMs: delayPerRequest,
        });
        return delayPerRequest;
      }

      return 0;
    }

    // No requests remaining - must wait until reset
    const now = new Date();
    const msUntilReset = resetAt.getTime() - now.getTime();

    if (msUntilReset > 0) {
      logger.warn("Rate limit exceeded, waiting until reset", {
        resetAt: resetAt.toISOString(),
        waitMs: msUntilReset,
      });
      return msUntilReset;
    }

    return 0;
  }

  /**
   * Wait if necessary before making next request
   * Returns a promise that resolves when it's safe to proceed
   */
  async waitIfNeeded(): Promise<void> {
    const delay = this.getDelay();

    if (delay > 0) {
      logger.info(`Waiting ${delay}ms before next request due to rate limit`);
      await this.sleep(delay);
    }
  }

  /**
   * Check if rate limit is exhausted
   */
  isExhausted(): boolean {
    if (!this.rateLimitInfo) {
      return false;
    }

    return this.rateLimitInfo.remaining === 0;
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Get total number of requests made
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Reset the rate limiter state
   * Useful for testing or when switching tokens
   */
  reset(): void {
    this.rateLimitInfo = null;
    this.requestCount = 0;
    logger.debug("Rate limiter reset");
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate percentage of rate limit remaining
   */
  getRemainingPercentage(): number {
    if (!this.rateLimitInfo) {
      return 100;
    }

    return (this.rateLimitInfo.remaining / this.rateLimitInfo.limit) * 100;
  }

  /**
   * Get time remaining until rate limit reset
   */
  getTimeUntilReset(): number {
    if (!this.rateLimitInfo) {
      return 0;
    }

    const now = new Date();
    const msUntilReset = this.rateLimitInfo.resetAt.getTime() - now.getTime();

    return Math.max(0, msUntilReset);
  }

  /**
   * Format rate limit status as human-readable string
   */
  getStatusMessage(): string {
    if (!this.rateLimitInfo) {
      return "No rate limit information available";
    }

    const { remaining, limit, resetAt } = this.rateLimitInfo;
    const percentage = this.getRemainingPercentage().toFixed(1);
    const timeUntilReset = Math.ceil(this.getTimeUntilReset() / 1000 / 60); // minutes

    return `Rate limit: ${remaining}/${limit} requests remaining (${percentage}%), resets in ${timeUntilReset} minutes`;
  }
}
