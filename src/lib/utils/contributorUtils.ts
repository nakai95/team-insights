import { ContributorDto } from "@/application/dto/ContributorDto";

/**
 * Calculate the total activity score for a contributor
 * Combines implementation activity score and review activity score
 *
 * @param contributor - The contributor to calculate the score for
 * @returns The total activity score (implementation + review)
 */
export function getTotalActivityScore(contributor: ContributorDto): number {
  return (
    contributor.implementationActivity.activityScore +
    contributor.reviewActivity.reviewScore
  );
}
