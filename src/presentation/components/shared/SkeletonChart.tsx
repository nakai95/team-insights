/**
 * SkeletonChart Component
 *
 * Purpose: Reusable skeleton placeholder for chart components
 *
 * Features:
 * - Configurable height via Tailwind height classes
 * - Optional title/description placeholders
 * - Animated pulse effect for visual feedback
 * - Matches the structure of real chart containers
 *
 * Performance: Lightweight, renders immediately
 *
 * Usage:
 * ```typescript
 * <SkeletonChart height="h-96" title="Loading PR metrics..." />
 * <SkeletonChart height="h-64" /> // No title
 * ```
 */

interface SkeletonChartProps {
  /**
   * Height class from Tailwind (e.g., "h-64", "h-96", "h-[400px]")
   * Default: "h-80"
   */
  height?: string;

  /**
   * Optional title to display above the skeleton
   * Shows a pulsing text placeholder if provided
   */
  title?: string;

  /**
   * Optional description text below the title
   * Shows a smaller pulsing text placeholder if provided
   */
  description?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function SkeletonChart({
  height = "h-80",
  title,
  description,
  className = "",
}: SkeletonChartProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Title and Description Placeholders */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <div className="flex items-center gap-2">
              <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            </div>
          )}
          {description && (
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          )}
        </div>
      )}

      {/* Chart Container Skeleton */}
      <div
        className={`bg-card border border-border rounded-lg p-6 ${height} flex items-center justify-center relative overflow-hidden`}
      >
        {/* Animated gradient overlay for shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted/50 to-transparent" />

        {/* Chart Structure Placeholder */}
        <div className="w-full h-full flex flex-col justify-between opacity-50">
          {/* Y-axis labels skeleton */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col justify-between h-full space-y-4 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-3 w-8 bg-muted animate-pulse rounded"
                />
              ))}
            </div>

            {/* Chart bars/lines placeholder */}
            <div className="flex-1 flex items-end justify-around gap-2 h-full py-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div
                  key={i}
                  className="flex-1 bg-muted animate-pulse rounded-t"
                  style={{
                    height: `${Math.random() * 60 + 40}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* X-axis labels skeleton */}
          <div className="flex justify-around gap-2 mt-4 ml-12">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-3 w-12 bg-muted animate-pulse rounded"
              />
            ))}
          </div>
        </div>

        {/* Loading indicator text */}
        {title && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
