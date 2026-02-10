"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useIdentityMerge } from "@/presentation/hooks/useIdentityMerge";
import { GitMerge, User, Mail, AlertCircle, Sparkles } from "lucide-react";
import { detectMergeCandidates } from "@/lib/utils/mergeDetection";

export interface IdentityMergerProps {
  contributors: ContributorDto[];
  repositoryUrl: string;
  onMergeComplete: (mergedContributor: ContributorDto) => void;
}

/**
 * Component for merging duplicate contributor identities
 * Allows users to select multiple contributors and designate one as primary
 */
export function IdentityMerger({
  contributors,
  repositoryUrl,
  onMergeComplete,
}: IdentityMergerProps) {
  const t = useTranslations("identityMerger");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const {
    selectedContributors,
    toggleContributor,
    clearSelection,
    isPrimarySelected,
    setPrimary,
    primaryContributorId,
    canMerge,
    performMerge,
    isLoading,
  } = useIdentityMerge();

  // Detect merge suggestions
  const mergeSuggestions = useMemo(() => {
    return detectMergeCandidates(contributors);
  }, [contributors]);

  const handleMerge = async () => {
    const result = await performMerge(repositoryUrl, contributors);
    if (result) {
      setIsDialogOpen(false);
      onMergeComplete(result);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      clearSelection();
      setShowSuggestions(true);
    }
  };

  // Apply a suggestion
  const applySuggestion = (suggestionIndex: number) => {
    const suggestion = mergeSuggestions[suggestionIndex];
    if (!suggestion) return;

    // Clear current selection
    clearSelection();

    // Select all contributors in the suggestion
    toggleContributor(suggestion.primary.id);
    suggestion.candidates.forEach((candidate) => {
      toggleContributor(candidate.id);
    });

    // Set primary
    setPrimary(suggestion.primary.id);

    // Hide suggestions after applying
    setShowSuggestions(false);
  };

  // Get all selected contributors for preview
  const selectedContributorsList = Array.from(selectedContributors)
    .map((id) => contributors.find((c) => c.id === id))
    .filter(Boolean) as ContributorDto[];

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GitMerge className="h-4 w-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GitMerge className="h-4 w-4" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-1 -mx-1 min-h-0">
          <div className="space-y-3 py-2">
            {/* Suggestions Section */}
            {showSuggestions && mergeSuggestions.length > 0 && (
              <div className="border border-primary/50 rounded-lg bg-card">
                <div className="px-3 py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-sm font-medium">
                      {t("suggestions.title")}
                    </h3>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {mergeSuggestions.slice(0, 2).map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded hover:bg-accent/50 transition-colors"
                    >
                      <Badge
                        variant={
                          suggestion.confidence === "high"
                            ? "default"
                            : suggestion.confidence === "medium"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs shrink-0"
                      >
                        {suggestion.confidence === "high"
                          ? t("suggestions.highConfidence")
                          : suggestion.confidence === "medium"
                            ? t("suggestions.mediumConfidence")
                            : t("suggestions.lowConfidence")}
                      </Badge>
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="font-medium">
                          {suggestion.primary.displayName}
                        </span>
                        <span className="text-muted-foreground"> ← </span>
                        <span className="text-muted-foreground truncate">
                          {suggestion.candidates
                            .map((c) => c.displayName)
                            .join(", ")}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 shrink-0"
                        onClick={() => applySuggestion(index)}
                      >
                        {t("suggestions.apply")}
                      </Button>
                    </div>
                  ))}
                  {mergeSuggestions.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      {t("suggestions.moreAvailable", {
                        count: mergeSuggestions.length - 2,
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Contributor Selection List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  {t("selectSection.title")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t("instructions.step1")} → {t("instructions.step2")}
                </p>
              </div>
              <div className="border rounded-lg divide-y max-h-[240px] overflow-y-auto">
                {contributors.map((contributor) => {
                  const isSelected = selectedContributors.has(contributor.id);
                  const isPrimary = isPrimarySelected(contributor.id);

                  return (
                    <div
                      key={contributor.id}
                      className={`p-2 hover:bg-accent/50 transition-colors ${
                        isPrimary ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            toggleContributor(contributor.id)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {contributor.displayName}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              {contributor.primaryEmail}
                            </span>
                            <span className="whitespace-nowrap">
                              {contributor.implementationActivity.commitCount}{" "}
                              commits
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Merge Preview */}
            {selectedContributors.size > 0 && (
              <div className="border rounded-lg bg-card">
                <div className="px-3 py-2 border-b">
                  <h3 className="text-sm font-medium">
                    {t("preview.title")} ({selectedContributors.size})
                  </h3>
                </div>
                <div className="p-3">
                  {selectedContributorsList.length > 0 ? (
                    <div className="space-y-1">
                      {selectedContributorsList.map((contributor) => {
                        const isPrimary = isPrimarySelected(contributor.id);
                        return (
                          <div
                            key={contributor.id}
                            className={`p-2 rounded text-xs flex items-center justify-between gap-2 transition-colors ${
                              isPrimary
                                ? "bg-primary/10 border border-primary/50"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium truncate">
                                  {contributor.displayName}
                                </span>
                                {isPrimary && (
                                  <Badge
                                    variant="default"
                                    className="text-xs h-4 px-1.5"
                                  >
                                    {t("contributor.primaryBadge")}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground truncate">
                                {contributor.primaryEmail}
                              </div>
                            </div>
                            {!isPrimary && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs shrink-0"
                                onClick={() => setPrimary(contributor.id)}
                              >
                                {t("actions.setAsPrimary")}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {!primaryContributorId && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded mt-2">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>{t("preview.selectPrimaryPrompt")}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => handleDialogClose(false)}
            disabled={isLoading}
          >
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleMerge} disabled={!canMerge || isLoading}>
            {isLoading ? t("actions.merging") : t("actions.merge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
