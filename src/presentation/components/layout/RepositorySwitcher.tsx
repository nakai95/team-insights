"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, ChevronsUpDown, GitBranch } from "lucide-react";
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

/**
 * RepositorySwitcher Component
 *
 * Purpose: Repository selection dropdown (Google Analytics style property switcher)
 *
 * Features:
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

interface Repository {
  id: string; // "owner/repo"
  displayName: string;
}

export function RepositorySwitcher() {
  const t = useTranslations("layout.repositorySwitcher");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentRepo = searchParams.get("repo");

  // Get recent repositories from localStorage
  const getRecentRepositories = (): Repository[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [recentRepos] = useState<Repository[]>(getRecentRepositories());

  // Add repository to recent list
  const addToRecent = (repoId: string) => {
    if (typeof window === "undefined") return;

    try {
      const recent = getRecentRepositories();
      const newRepo: Repository = { id: repoId, displayName: repoId };

      // Remove if already exists
      const filtered = recent.filter((r) => r.id !== repoId);

      // Add to beginning and limit to MAX_RECENT
      const updated = [newRepo, ...filtered].slice(0, MAX_RECENT);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("noResults")}</CommandEmpty>

            {recentRepos.length > 0 && (
              <CommandGroup heading={t("recentRepositories")}>
                {recentRepos.map((repo) => (
                  <CommandItem
                    key={repo.id}
                    value={repo.id}
                    onSelect={() => handleSelect(repo.id)}
                  >
                    <GitBranch className="mr-2 h-4 w-4" />
                    <span className="truncate">{repo.displayName}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        currentRepo === repo.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading={t("enterRepository")}>
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t("hint")}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
