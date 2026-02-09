"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, GitBranch, Clock } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { fetchUserRepositories, type Repository } from "@/app/[locale]/analytics/actions";

/**
 * RepositorySwitcher Component
 *
 * Purpose: Repository selection dropdown (Google Analytics style property switcher)
 *
 * Features:
 * - Fetches user's repositories from GitHub API
 * - Searchable repository list
 * - Recently viewed repositories (from localStorage)
 * - Current repository displayed in button
 * - Updates URL when repository changes
 *
 * Usage:
 * ```tsx
 * <RepositorySwitcher />
 * ```
 */

const STORAGE_KEY = "team-insights:recent-repositories";
const MAX_RECENT = 10;

export function RepositorySwitcher() {
  const t = useTranslations("layout.repositorySwitcher");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [recentRepoIds, setRecentRepoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRepo = searchParams.get("repo");

  // Load repositories and recent history on mount
  useEffect(() => {
    loadRepositories();
    loadRecentRepositories();
  }, []);

  // Save current repo to recent history
  useEffect(() => {
    if (currentRepo) {
      addToRecent(currentRepo);
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

  // Get recent repositories from localStorage
  const loadRecentRepositories = () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ id: string }>;
        setRecentRepoIds(parsed.map((r) => r.id));
      }
    } catch {
      setRecentRepoIds([]);
    }
  };

  // Add repository to recent list
  const addToRecent = (repoId: string) => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let recent: Array<{ id: string; displayName: string }> = stored
        ? JSON.parse(stored)
        : [];

      // Remove if already exists
      recent = recent.filter((r) => r.id !== repoId);

      // Add to beginning
      recent.unshift({ id: repoId, displayName: repoId });

      // Limit to MAX_RECENT
      recent = recent.slice(0, MAX_RECENT);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
      setRecentRepoIds(recent.map((r) => r.id));
    } catch (error) {
      console.error("Failed to save recent repository:", error);
    }
  };

  // Handle repository selection
  const handleSelect = (repoId: string) => {
    if (repoId === currentRepo) {
      setOpen(false);
      return;
    }

    // Add to recent list
    addToRecent(repoId);

    // Build new URL with updated repo parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("repo", repoId);

    // Navigate to analytics page with new repo
    router.push(`/analytics?${params.toString()}`);
    setOpen(false);
  };

  // Get recent repositories with metadata
  const recentRepositories = recentRepoIds
    .map((id) => repositories.find((r) => r.fullName === id))
    .filter(Boolean) as Repository[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={t("selectRepository")}
          className="justify-between min-w-[200px] max-w-[300px]"
        >
          {currentRepo ? (
            <span className="flex items-center gap-2 truncate">
              <GitBranch className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{currentRepo}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{t("placeholder")}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>
              {loading
                ? t("loading")
                : error
                  ? `${t("error")}: ${error}`
                  : t("noResults")}
            </CommandEmpty>

            {/* Recent repositories */}
            {recentRepositories.length > 0 && (
              <CommandGroup heading={t("recentRepositories")}>
                {recentRepositories.map((repo) => (
                  <CommandItem
                    key={repo.id}
                    value={repo.fullName}
                    onSelect={() => handleSelect(repo.fullName)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentRepo === repo.fullName
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{repo.fullName}</div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* All repositories */}
            {repositories.length > 0 && (
              <CommandGroup heading={t("allRepositories")}>
                {repositories.slice(0, 20).map((repo) => (
                  <CommandItem
                    key={repo.id}
                    value={repo.fullName}
                    onSelect={() => handleSelect(repo.fullName)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentRepo === repo.fullName
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <GitBranch className="mr-2 h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{repo.fullName}</div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
