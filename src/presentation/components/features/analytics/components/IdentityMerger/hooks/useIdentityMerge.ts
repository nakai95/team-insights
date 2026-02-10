import { useState, useCallback } from "react";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { mergeIdentities } from "@/app/actions/mergeIdentities";
import { useToast } from "@/hooks/use-toast";

export interface UseIdentityMergeReturn {
  selectedContributors: Set<string>;
  toggleContributor: (contributorId: string) => void;
  clearSelection: () => void;
  isPrimarySelected: (contributorId: string) => boolean;
  setPrimary: (contributorId: string) => void;
  primaryContributorId: string | null;
  canMerge: boolean;
  performMerge: (
    repositoryUrl: string,
    contributors: ContributorDto[],
  ) => Promise<ContributorDto | null>;
  isLoading: boolean;
}

/**
 * Custom hook for managing identity merge state and operations
 * Handles contributor selection, primary contributor designation, and merge execution
 */
export function useIdentityMerge(): UseIdentityMergeReturn {
  const [selectedContributors, setSelectedContributors] = useState<Set<string>>(
    new Set(),
  );
  const [primaryContributorId, setPrimaryContributorId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Toggle a contributor's selection status
   */
  const toggleContributor = useCallback((contributorId: string) => {
    setSelectedContributors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contributorId)) {
        newSet.delete(contributorId);
        // If this was the primary, clear primary selection
        setPrimaryContributorId((currentPrimary) =>
          currentPrimary === contributorId ? null : currentPrimary,
        );
      } else {
        newSet.add(contributorId);
      }
      return newSet;
    });
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedContributors(new Set());
    setPrimaryContributorId(null);
  }, []);

  /**
   * Check if a contributor is the primary
   */
  const isPrimarySelected = useCallback(
    (contributorId: string) => {
      return primaryContributorId === contributorId;
    },
    [primaryContributorId],
  );

  /**
   * Set a contributor as the primary for the merge
   */
  const setPrimary = useCallback(
    (contributorId: string) => {
      // Only allow setting primary if contributor is selected
      if (selectedContributors.has(contributorId)) {
        setPrimaryContributorId(contributorId);
      }
    },
    [selectedContributors],
  );

  /**
   * Check if merge can be performed
   * Requires at least 2 selected contributors and 1 primary
   */
  const canMerge =
    selectedContributors.size >= 2 && primaryContributorId !== null;

  /**
   * Perform the merge operation
   */
  const performMerge = useCallback(
    async (
      repositoryUrl: string,
      contributors: ContributorDto[],
    ): Promise<ContributorDto | null> => {
      if (!canMerge || !primaryContributorId) {
        toast({
          title: "Cannot merge",
          description:
            "Please select at least 2 contributors and designate one as primary.",
          variant: "destructive",
        });
        return null;
      }

      setIsLoading(true);

      try {
        // Get merged contributor IDs (all selected except primary)
        const mergedIds = Array.from(selectedContributors).filter(
          (id) => id !== primaryContributorId,
        );

        // Call server action with DTOs (not domain entities)
        // Server Actions can only accept plain JSON objects
        const result = await mergeIdentities({
          repositoryUrl,
          primaryContributorId,
          mergedContributorIds: mergedIds,
          contributors,
        });

        if (!result.ok) {
          toast({
            title: "Merge failed",
            description: result.error.message,
            variant: "destructive",
          });
          return null;
        }

        toast({
          title: "Merge successful",
          description: `Successfully merged ${mergedIds.length} contributor${mergedIds.length > 1 ? "s" : ""} into ${result.value.mergedContributor.displayName}`,
        });

        // Clear selections after successful merge
        clearSelection();

        return result.value.mergedContributor;
      } catch (error) {
        toast({
          title: "Merge failed",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      canMerge,
      primaryContributorId,
      selectedContributors,
      clearSelection,
      toast,
    ],
  );

  return {
    selectedContributors,
    toggleContributor,
    clearSelection,
    isPrimarySelected,
    setPrimary,
    primaryContributorId,
    canMerge,
    performMerge,
    isLoading,
  };
}
