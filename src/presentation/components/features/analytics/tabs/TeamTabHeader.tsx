"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ContributorDto } from "@/application/dto/ContributorDto";
import { IdentityMerger } from "../components/IdentityMerger";
import { Users } from "lucide-react";

interface TeamTabHeaderProps {
  repositoryUrl: string;
  contributors: ContributorDto[];
}

/**
 * TeamTab Header Component
 *
 * Purpose: Header section for Team tab including identity merger
 *
 * Architecture:
 * - Client Component (required for IdentityMerger)
 * - Handles merge completion by reloading the page to reflect changes
 */
export function TeamTabHeader({
  repositoryUrl,
  contributors,
}: TeamTabHeaderProps) {
  const t = useTranslations("analytics.team");
  const router = useRouter();

  const handleMergeComplete = () => {
    // Reload to reflect merged contributor data
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold">{t("title")}</h2>
      </div>
      <IdentityMerger
        contributors={contributors}
        repositoryUrl={repositoryUrl}
        onMergeComplete={handleMergeComplete}
      />
    </div>
  );
}
