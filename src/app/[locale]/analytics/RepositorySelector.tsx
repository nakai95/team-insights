"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Clock, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { fetchUserRepositories, type Repository } from "./actions";
import { useTranslations } from "next-intl";

/**
 * RepositorySelector Component
 *
 * Purpose: Google Analytics-style repository selector with search
 *
 * Features:
 * - Fetches user's repositories from GitHub API
 * - Searchable combobox
 * - Shows recent repositories (from localStorage)
 * - Displays repository metadata (language, stars, private)
 * - Updates URL on selection
 *
 * Usage:
 * ```typescript
 * <RepositorySelector currentRepo="facebook/react" />
 * ```
 */

interface RepositorySelectorProps {
  currentRepo: string;
}

const RECENT_REPOS_KEY = "analytics_recent_repos";
const MAX_RECENT_REPOS = 5;

export function RepositorySelector({ currentRepo }: RepositorySelectorProps) {
  const router = useRouter();
  const t = useTranslations("analytics");

  const [open, setOpen] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [recentRepos, setRecentRepos] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load repositories and recent history on mount
  React.useEffect(() => {
    loadRepositories();
    loadRecentRepos();
  }, []);

  // Save current repo to recent history
  React.useEffect(() => {
    if (currentRepo) {
      saveToRecentRepos(currentRepo);
    }
  }, [currentRepo]);

  const loadRepositories = async () => {
    setLoading(true);
    setError(null);

    const result = await fetchUserRepositories();

    if (result.ok) {
      setRepositories(result.value);
    } else {
      setError(result.error.message);
    }

    setLoading(false);
  };

  const loadRecentRepos = () => {
    try {
      const stored = localStorage.getItem(RECENT_REPOS_KEY);
      if (stored) {
        setRecentRepos(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load recent repos:", error);
    }
  };

  const saveToRecentRepos = (repo: string) => {
    try {
      const stored = localStorage.getItem(RECENT_REPOS_KEY);
      let recent: string[] = stored ? JSON.parse(stored) : [];

      // Remove if already exists
      recent = recent.filter((r) => r !== repo);

      // Add to front
      recent.unshift(repo);

      // Limit to MAX_RECENT_REPOS
      recent = recent.slice(0, MAX_RECENT_REPOS);

      localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(recent));
      setRecentRepos(recent);
    } catch (error) {
      console.error("Failed to save recent repo:", error);
    }
  };

  const handleSelect = (fullName: string) => {
    setOpen(false);

    // Update URL with new repository
    const params = new URLSearchParams(window.location.search);
    params.set("repo", fullName);

    router.push(`?${params.toString()}`);
  };

  // Filter repositories based on search
  const [searchQuery, setSearchQuery] = React.useState("");
  const filteredRepositories = React.useMemo(() => {
    if (!searchQuery) {
      return repositories;
    }

    const query = searchQuery.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query),
    );
  }, [repositories, searchQuery]);

  // Get recent repositories with metadata
  const recentRepositories = React.useMemo(() => {
    return recentRepos
      .map((fullName) => repositories.find((r) => r.fullName === fullName))
      .filter(Boolean) as Repository[];
  }, [recentRepos, repositories]);

  const currentRepository = repositories.find(
    (r) => r.fullName === currentRepo,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {currentRepository ? currentRepository.fullName : currentRepo}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t("repositorySelector.searchPlaceholder")}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading
                ? t("repositorySelector.loading")
                : error
                  ? `${t("repositorySelector.error")}: ${error}`
                  : t("repositorySelector.noRepositoryFound")}
            </CommandEmpty>

            {/* Recent repositories */}
            {recentRepositories.length > 0 && (
              <CommandGroup heading={t("repositorySelector.recent")}>
                {recentRepositories.map((repo) => (
                  <CommandItem
                    key={repo.id}
                    value={repo.fullName}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentRepo === repo.fullName
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium truncate">
                          {repo.fullName}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <RepositoryBadges repo={repo} t={t} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* All repositories */}
            <CommandGroup heading={t("repositorySelector.yourRepositories")}>
              {filteredRepositories.slice(0, 20).map((repo) => (
                <CommandItem
                  key={repo.id}
                  value={repo.fullName}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentRepo === repo.fullName
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{repo.fullName}</div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <RepositoryBadges repo={repo} t={t} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RepositoryBadges({
  repo,
  t,
}: {
  repo: Repository;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-1 ml-2">
      {repo.language && (
        <Badge variant="secondary" className="text-[10px] px-1 py-0">
          {repo.language}
        </Badge>
      )}
      {repo.isPrivate && (
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {t("repositorySelector.private")}
        </Badge>
      )}
      {repo.stargazersCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3" />
          {repo.stargazersCount > 1000
            ? `${(repo.stargazersCount / 1000).toFixed(1)}k`
            : repo.stargazersCount}
        </div>
      )}
    </div>
  );
}
