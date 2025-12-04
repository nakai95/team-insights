"use client";

import { useState } from "react";
import { ContributorDto } from "@/application/dto/ContributorDto";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIdentityMerge } from "@/presentation/hooks/useIdentityMerge";
import { GitMerge, User, Mail, AlertCircle } from "lucide-react";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    }
  };

  // Get primary contributor details
  const primaryContributor = primaryContributorId
    ? contributors.find((c) => c.id === primaryContributorId)
    : null;

  // Get merged contributors details
  const mergedContributors = Array.from(selectedContributors)
    .filter((id) => id !== primaryContributorId)
    .map((id) => contributors.find((c) => c.id === id))
    .filter(Boolean) as ContributorDto[];

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GitMerge className="h-4 w-4" />
          Merge Identities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge Duplicate Contributors
          </DialogTitle>
          <DialogDescription>
            Select contributors that represent the same person. Choose one as
            the primary identity to preserve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to merge:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Check the boxes for contributors to merge</li>
                <li>
                  Click &quot;Set as Primary&quot; on the identity you want to
                  keep
                </li>
                <li>
                  Review the preview and click &quot;Merge Identities&quot;
                </li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Contributor Selection List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Select Contributors</h4>
            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {contributors.map((contributor) => {
                const isSelected = selectedContributors.has(contributor.id);
                const isPrimary = isPrimarySelected(contributor.id);

                return (
                  <div
                    key={contributor.id}
                    className={`p-3 hover:bg-accent/50 transition-colors ${
                      isPrimary ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          toggleContributor(contributor.id)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {contributor.displayName}
                          </span>
                          {isPrimary && (
                            <Badge variant="default" className="ml-auto">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {contributor.primaryEmail}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>
                            {contributor.implementationActivity.commitCount}{" "}
                            commits
                          </span>
                          <span>
                            {contributor.reviewActivity.pullRequestsReviewed}{" "}
                            reviews
                          </span>
                        </div>
                      </div>
                      {isSelected && !isPrimary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrimary(contributor.id)}
                        >
                          Set as Primary
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Merge Preview */}
          {selectedContributors.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Merge Preview</CardTitle>
                <CardDescription>
                  {selectedContributors.size} contributor
                  {selectedContributors.size > 1 ? "s" : ""} selected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {primaryContributor ? (
                  <>
                    <div>
                      <div className="text-sm font-medium mb-2">
                        Primary Identity (will be preserved):
                      </div>
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <div className="font-medium">
                          {primaryContributor.displayName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {primaryContributor.primaryEmail}
                        </div>
                      </div>
                    </div>

                    {mergedContributors.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">
                          Will be merged into primary:
                        </div>
                        <div className="space-y-2">
                          {mergedContributors.map((contributor) => (
                            <div
                              key={contributor.id}
                              className="bg-muted p-2 rounded text-sm"
                            >
                              <div className="font-medium">
                                {contributor.displayName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {contributor.primaryEmail}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please select a primary identity by clicking &quot;Set as
                      Primary&quot; on one of the selected contributors.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleDialogClose(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={!canMerge || isLoading}>
            {isLoading ? "Merging..." : "Merge Identities"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
