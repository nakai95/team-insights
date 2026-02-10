import { ContributorDto } from "@/application/dto/ContributorDto";
import {
  areNamesSimilar,
  hasSameEmailDomain,
  calculateSimilarity,
} from "./nameSimilarity";

/**
 * Confidence level for merge suggestion
 */
export type MergeConfidence = "high" | "medium" | "low";

/**
 * Suggested merge group
 */
export interface MergeSuggestion {
  /** Suggested primary contributor (highest activity) */
  primary: ContributorDto;
  /** Contributors to merge into primary */
  candidates: ContributorDto[];
  /** Confidence level */
  confidence: MergeConfidence;
  /** Reason for suggestion */
  reason: string;
}

/**
 * Detect potential duplicate contributors and suggest merges
 */
export function detectMergeCandidates(
  contributors: ContributorDto[],
): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < contributors.length; i++) {
    const contributor = contributors[i]!;

    // Skip if already processed
    if (processed.has(contributor.id)) {
      continue;
    }

    const candidates: ContributorDto[] = [];
    let confidence: MergeConfidence = "low";
    const reasons: string[] = [];

    // Find similar contributors
    for (let j = i + 1; j < contributors.length; j++) {
      const other = contributors[j]!;

      // Skip if already processed
      if (processed.has(other.id)) {
        continue;
      }

      // Check for similar names
      const namesSimilar = areNamesSimilar(
        contributor.displayName,
        other.displayName,
      );

      // Check for same email domain
      const sameEmailDomain = hasSameEmailDomain(
        contributor.primaryEmail,
        other.primaryEmail,
      );

      // Determine if these should be merged
      if (namesSimilar && sameEmailDomain) {
        // High confidence: names similar AND same email domain
        candidates.push(other);
        confidence = "high";
        reasons.push("Similar names and same email domain");
        processed.add(other.id);
      } else if (namesSimilar) {
        // Medium confidence: names similar but different domains
        const similarity = calculateSimilarity(
          contributor.displayName,
          other.displayName,
        );
        if (similarity >= 0.6) {
          candidates.push(other);
          if (confidence !== "high") {
            confidence = "medium";
          }
          reasons.push(`Names are ${Math.round(similarity * 100)}% similar`);
          processed.add(other.id);
        }
      } else if (sameEmailDomain) {
        // Low confidence: same domain but different names
        // Could be the same person with different name formats
        const similarity = calculateSimilarity(
          contributor.displayName,
          other.displayName,
        );
        if (similarity >= 0.4) {
          candidates.push(other);
          reasons.push("Same email domain");
          processed.add(other.id);
        }
      }
    }

    // If we found candidates, add suggestion
    if (candidates.length > 0) {
      // Determine primary: contributor with most activity
      const allInGroup = [contributor, ...candidates];
      const primary = allInGroup.reduce((prev, current) => {
        const prevActivity =
          prev.implementationActivity.commitCount +
          prev.reviewActivity.pullRequestsReviewed;
        const currentActivity =
          current.implementationActivity.commitCount +
          current.reviewActivity.pullRequestsReviewed;
        return currentActivity > prevActivity ? current : prev;
      });

      // Remove primary from candidates
      const finalCandidates = allInGroup.filter((c) => c.id !== primary.id);

      suggestions.push({
        primary,
        candidates: finalCandidates,
        confidence,
        reason: reasons.join(", "),
      });

      // Mark primary as processed
      processed.add(primary.id);
    }
  }

  // Sort by confidence (high first)
  return suggestions.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
}
