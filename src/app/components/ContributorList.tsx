"use client";

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
  // Sort by total activity score (implementation + review)
  const sortedContributors = [...contributors].sort((a, b) => {
    const scoreA = getTotalActivityScore(a);
    const scoreB = getTotalActivityScore(b);
    return scoreB - scoreA;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contributors</CardTitle>
        <CardDescription>
          Ranked by overall activity (implementation + review)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Contributor</TableHead>
              <TableHead className="text-right">Commits</TableHead>
              <TableHead className="text-right">PRs</TableHead>
              <TableHead className="text-right">Reviews</TableHead>
              <TableHead className="text-right">Lines Changed</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContributors.map((contributor, index) => {
              const totalScore = getTotalActivityScore(contributor);

              return (
                <TableRow key={contributor.id}>
                  <TableCell className="font-medium">
                    {index === 0 && <Badge variant="default">1</Badge>}
                    {index === 1 && <Badge variant="secondary">2</Badge>}
                    {index === 2 && <Badge variant="secondary">3</Badge>}
                    {index > 2 && (
                      <span className="text-muted-foreground">{index + 1}</span>
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
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
