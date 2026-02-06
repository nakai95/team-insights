/**
 * DORAPerformanceLevel Value Object
 *
 * Classifies deployment frequency according to DORA (DevOps Research and Assessment)
 * performance benchmarks.
 *
 * DORA Levels:
 * - Elite: 730+ deployments/year (2+ per day)
 * - High: 52-729 deployments/year (1/week to <2/day)
 * - Medium: 12-51 deployments/year (1/month to <1/week)
 * - Low: 1-11 deployments/year (<1/month)
 * - Insufficient Data: 0 deployments
 *
 * Immutable - all properties are readonly.
 */

import { DeploymentFrequency } from "./DeploymentFrequency";

export const DORALevel = {
  ELITE: "elite",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INSUFFICIENT_DATA: "insufficient_data",
} as const;
export type DORALevel = (typeof DORALevel)[keyof typeof DORALevel];

export class DORAPerformanceLevel {
  private constructor(
    readonly level: DORALevel,
    readonly deploymentsPerYear: number,
    readonly description: string,
    readonly benchmarkRange: string,
    readonly displayColor: string,
    readonly improvementSuggestions: readonly string[],
  ) {}

  /**
   * Classify deployment frequency according to DORA benchmarks
   */
  static fromDeploymentFrequency(
    frequency: DeploymentFrequency,
  ): DORAPerformanceLevel {
    const deploymentsPerYear = frequency.deploymentsPerYear;

    if (frequency.totalCount === 0) {
      return new DORAPerformanceLevel(
        DORALevel.INSUFFICIENT_DATA,
        0,
        "No deployment data available.",
        "0 deployments",
        "#64748B", // gray-500
        [
          "Start tracking deployments by creating GitHub Releases",
          "Tag your commits with semantic versioning (v1.0.0)",
          "Set up GitHub Actions to create Deployment events",
        ],
      );
    }

    if (deploymentsPerYear >= 730) {
      return new DORAPerformanceLevel(
        DORALevel.ELITE,
        deploymentsPerYear,
        `Elite performance! Your team deploys ${Math.round(deploymentsPerYear)} times per year (${(deploymentsPerYear / 365).toFixed(1)} per day).`,
        "730+ deployments per year (2+ per day)",
        "#FFD700", // gold
        [], // No suggestions - already elite
      );
    }

    if (deploymentsPerYear >= 52) {
      return new DORAPerformanceLevel(
        DORALevel.HIGH,
        deploymentsPerYear,
        `High performance! Deploying ${Math.round(deploymentsPerYear)} times per year.`,
        "52-729 deployments per year (1/week to <2/day)",
        "#22C55E", // green-500
        [
          "Consider increasing deployment frequency to reach elite level (2+ per day)",
          "Implement continuous deployment practices",
          "Automate more of your deployment pipeline",
        ],
      );
    }

    if (deploymentsPerYear >= 12) {
      return new DORAPerformanceLevel(
        DORALevel.MEDIUM,
        deploymentsPerYear,
        `Medium performance. Deploying ${Math.round(deploymentsPerYear)} times per year.`,
        "12-51 deployments per year (1/month to <1/week)",
        "#F59E0B", // amber-500
        [
          "Increase deployment frequency by deploying smaller changes more often",
          "Improve CI/CD automation to reduce deployment friction",
          "Consider feature flags to decouple deployment from release",
          "Reduce batch sizes to enable more frequent deployments",
        ],
      );
    }

    // Low: 1-11 deployments per year
    return new DORAPerformanceLevel(
      DORALevel.LOW,
      deploymentsPerYear,
      `Low performance. Only ${Math.round(deploymentsPerYear)} deployments per year.`,
      "1-11 deployments per year (<1/month)",
      "#EF4444", // red-500
      [
        "Establish a regular deployment cadence (at least monthly)",
        "Invest in CI/CD automation to make deployments easier",
        "Break down large changes into smaller, deployable increments",
        "Build confidence through automated testing",
        "Consider implementing continuous deployment",
      ],
    );
  }

  /**
   * Get color class for UI display (Tailwind CSS)
   */
  getColorClass(): string {
    const colorMap: Record<DORALevel, string> = {
      elite: "text-yellow-500",
      high: "text-green-500",
      medium: "text-amber-500",
      low: "text-red-500",
      insufficient_data: "text-gray-500",
    };
    return colorMap[this.level];
  }

  /**
   * Get badge variant for UI display
   */
  getBadgeVariant(): "default" | "secondary" | "destructive" | "outline" {
    if (this.level === DORALevel.ELITE || this.level === DORALevel.HIGH) {
      return "default";
    }
    if (this.level === DORALevel.MEDIUM) {
      return "secondary";
    }
    if (this.level === DORALevel.LOW) {
      return "destructive";
    }
    return "outline";
  }

  /**
   * Check if performance level is considered good (Elite or High)
   */
  isGood(): boolean {
    return this.level === DORALevel.ELITE || this.level === DORALevel.HIGH;
  }

  /**
   * Convert to plain object for DTO
   */
  toDTO(): {
    level: DORALevel;
    deploymentsPerYear: number;
    description: string;
    benchmarkRange: string;
    displayColor: string;
    improvementSuggestions: string[];
  } {
    return {
      level: this.level,
      deploymentsPerYear: this.deploymentsPerYear,
      description: this.description,
      benchmarkRange: this.benchmarkRange,
      displayColor: this.displayColor,
      improvementSuggestions: [...this.improvementSuggestions],
    };
  }
}
