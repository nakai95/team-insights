"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalysisRequest } from "@/application/dto/AnalysisRequest";

export interface AnalysisFormProps {
  onSubmit: (request: AnalysisRequest) => void;
  isLoading?: boolean;
}

/**
 * Form component for inputting repository analysis parameters
 * Collects repository URL, GitHub token, and optional date range
 */
export function AnalysisForm({
  onSubmit,
  isLoading = false,
}: AnalysisFormProps) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const request: AnalysisRequest = {
      repositoryUrl: repositoryUrl.trim(),
      githubToken: githubToken.trim(),
      dateRange:
        startDate && endDate
          ? {
              start: startDate,
              end: endDate,
            }
          : undefined,
    };

    onSubmit(request);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Repository Analysis</CardTitle>
        <CardDescription>
          Analyze contributor activity for a GitHub repository
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repository-url">Repository URL *</Label>
            <Input
              id="repository-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Enter the full GitHub repository URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="github-token">GitHub Personal Access Token *</Label>
            <Input
              id="github-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Token with &apos;repo&apos; scope required for private
              repositories
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date (Optional)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Leave dates empty to analyze the last 6 months
          </p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Analyze Repository"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
