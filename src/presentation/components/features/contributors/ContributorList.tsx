"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ContributorDto } from "@/application/dto/ContributorDto";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTotalActivityScore } from "@/lib/utils/contributorUtils";

export interface ContributorListProps {
  contributors: ContributorDto[];
}

/**
 * Component to display a ranked list of contributors
 * Shows key metrics: commits, PRs, reviews, and activity scores
 */
export function ContributorList({ contributors }: ContributorListProps) {
  const t = useTranslations("contributorList");

  // Cache sorted contributors with pre-calculated scores
  const sortedContributorsWithScores = useMemo(() => {
    return [...contributors]
      .map((contributor) => ({
        contributor,
        totalScore: getTotalActivityScore(contributor),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [contributors]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t("rank")}</TableHead>
              <TableHead>{t("contributor")}</TableHead>
              <TableHead className="text-right">{t("commits")}</TableHead>
              <TableHead className="text-right">{t("prs")}</TableHead>
              <TableHead className="text-right">{t("reviews")}</TableHead>
              <TableHead className="text-right">{t("linesChanged")}</TableHead>
              <TableHead className="text-right">{t("score")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContributorsWithScores.map(
              ({ contributor, totalScore }, index) => {
                return (
                  <TableRow key={contributor.id}>
                    <TableCell className="font-medium">
                      {index === 0 && <Badge variant="default">1</Badge>}
                      {index === 1 && <Badge variant="secondary">2</Badge>}
                      {index === 2 && <Badge variant="secondary">3</Badge>}
                      {index > 2 && (
                        <span className="text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {contributor.displayName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contributor.primaryEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {contributor.implementationActivity.commitCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {contributor.reviewActivity.pullRequestCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {contributor.reviewActivity.pullRequestsReviewed}
                    </TableCell>
                    <TableCell className="text-right">
                      {contributor.implementationActivity.totalLineChanges.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{totalScore.toFixed(1)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              },
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
