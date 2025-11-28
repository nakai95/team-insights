import { describe, it, expect } from "vitest";
import { ActivityAggregationService } from "@/domain/services/ActivityAggregationService";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { DateRange } from "@/domain/value-objects/DateRange";
import { Contributor } from "@/domain/entities/Contributor";
import { Email } from "@/domain/value-objects/Email";
import { Period, TrendDirection } from "@/domain/types";

describe("ActivityAggregationService", () => {
  // Helper to create test snapshot
  const createSnapshot = (
    date: Date,
    period: Period,
    commitCount: number,
    linesAdded: number,
    pullRequestCount: number,
    reviewComments: number,
  ) => {
    const implResult = ImplementationActivity.create({
      commitCount,
      linesAdded,
      linesDeleted: 0,
      linesModified: 0,
      filesChanged: 1,
    });

    const reviewResult = ReviewActivity.create({
      pullRequestCount,
      reviewCommentCount: reviewComments,
      pullRequestsReviewed: 0,
    });

    if (!implResult.ok || !reviewResult.ok) {
      throw new Error("Test setup failed");
    }

    const snapshotResult = ActivitySnapshot.create(
      date,
      period,
      implResult.value,
      reviewResult.value,
    );

    if (!snapshotResult.ok) {
      throw new Error("Test setup failed");
    }

    return snapshotResult.value;
  };

  describe("aggregateByPeriod", () => {
    it("should return empty array for empty timeline", () => {
      const result = ActivityAggregationService.aggregateByPeriod(
        [],
        Period.WEEK,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should aggregate daily snapshots into weekly periods", () => {
      const snapshots = [
        createSnapshot(new Date("2024-01-01"), Period.DAY, 2, 100, 1, 5),
        createSnapshot(new Date("2024-01-02"), Period.DAY, 3, 150, 0, 0),
        createSnapshot(new Date("2024-01-03"), Period.DAY, 1, 50, 2, 10),
        createSnapshot(new Date("2024-01-08"), Period.DAY, 4, 200, 1, 3), // Different week
      ];

      const result = ActivityAggregationService.aggregateByPeriod(
        snapshots,
        Period.WEEK,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // Two weeks

        // First week (Jan 1-7)
        const week1 = result.value[0]!;
        expect(week1.period).toBe(Period.WEEK);
        expect(week1.implementationActivity.commitCount).toBe(6); // 2+3+1
        expect(week1.implementationActivity.linesAdded).toBe(300); // 100+150+50
        expect(week1.reviewActivity.pullRequestCount).toBe(3); // 1+0+2
        expect(week1.reviewActivity.reviewCommentCount).toBe(15); // 5+0+10

        // Second week (Jan 8-14)
        const week2 = result.value[1]!;
        expect(week2.implementationActivity.commitCount).toBe(4);
        expect(week2.implementationActivity.linesAdded).toBe(200);
      }
    });

    it("should aggregate daily snapshots into monthly periods", () => {
      const snapshots = [
        createSnapshot(new Date("2024-01-15"), Period.DAY, 5, 100, 2, 10),
        createSnapshot(new Date("2024-01-20"), Period.DAY, 3, 50, 1, 5),
        createSnapshot(new Date("2024-02-05"), Period.DAY, 7, 200, 3, 15), // Different month
      ];

      const result = ActivityAggregationService.aggregateByPeriod(
        snapshots,
        Period.MONTH,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // Two months

        // January
        const jan = result.value[0]!;
        expect(jan.period).toBe(Period.MONTH);
        expect(jan.implementationActivity.commitCount).toBe(8); // 5+3
        expect(jan.implementationActivity.linesAdded).toBe(150); // 100+50

        // February
        const feb = result.value[1]!;
        expect(feb.implementationActivity.commitCount).toBe(7);
        expect(feb.implementationActivity.linesAdded).toBe(200);
      }
    });

    it("should keep same period granularity when aggregating by day", () => {
      const snapshots = [
        createSnapshot(new Date("2024-01-01"), Period.DAY, 2, 100, 1, 5),
        createSnapshot(new Date("2024-01-02"), Period.DAY, 3, 150, 0, 0),
      ];

      const result = ActivityAggregationService.aggregateByPeriod(
        snapshots,
        Period.DAY,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2); // Each day separate
        expect(result.value[0]!.implementationActivity.commitCount).toBe(2);
        expect(result.value[1]!.implementationActivity.commitCount).toBe(3);
      }
    });

    it("should sort aggregated results chronologically", () => {
      const snapshots = [
        createSnapshot(new Date("2024-02-15"), Period.DAY, 5, 100, 2, 10),
        createSnapshot(new Date("2024-01-15"), Period.DAY, 3, 50, 1, 5),
        createSnapshot(new Date("2024-03-15"), Period.DAY, 7, 200, 3, 15),
      ];

      const result = ActivityAggregationService.aggregateByPeriod(
        snapshots,
        Period.MONTH,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0]!.date.getMonth()).toBe(0); // January (0-indexed)
        expect(result.value[1]!.date.getMonth()).toBe(1); // February
        expect(result.value[2]!.date.getMonth()).toBe(2); // March
      }
    });
  });

  describe("calculateTrends", () => {
    it("should reject empty timeline", () => {
      const result = ActivityAggregationService.calculateTrends([]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain(
          "Cannot calculate trends from empty timeline",
        );
      }
    });

    it("should return stable trend for single snapshot", () => {
      const snapshots = [
        createSnapshot(new Date("2024-01-01"), Period.DAY, 5, 100, 2, 10),
      ];

      const result = ActivityAggregationService.calculateTrends(snapshots);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.direction).toBe(TrendDirection.STABLE);
        expect(result.value.velocity).toBe(0);
      }
    });

    it("should detect increasing trend", () => {
      const snapshots = [
        createSnapshot(new Date("2024-01-01"), Period.WEEK, 1, 10, 0, 0), // Score: 10+10 = 20
        createSnapshot(new Date("2024-01-08"), Period.WEEK, 5, 50, 1, 5), // Score: 50+50+25 = 125
        createSnapshot(new Date("2024-01-15"), Period.WEEK, 10, 100, 2, 10), // Score: 100+100+50 = 250
      ];

      const result = ActivityAggregationService.calculateTrends(snapshots);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.direction).toBe(TrendDirection.INCREASING);
        expect(result.value.velocity).toBeGreaterThan(0);
      }
    });

    it("should detect decreasing trend", () => {
      const snapshots = [
        createSnapshot(new Date("2024-01-01"), Period.WEEK, 10, 100, 2, 10), // High activity
        createSnapshot(new Date("2024-01-08"), Period.WEEK, 5, 50, 1, 5), // Medium activity
        createSnapshot(new Date("2024-01-15"), Period.WEEK, 1, 10, 0, 0), // Low activity
      ];

      const result = ActivityAggregationService.calculateTrends(snapshots);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.direction).toBe(TrendDirection.DECREASING);
        expect(result.value.velocity).toBeLessThan(0);
      }
    });

    it("should detect stable trend for consistent activity", () => {
      const snapshots = [
        createSnapshot(new Date("2024-01-01"), Period.WEEK, 5, 50, 1, 5),
        createSnapshot(new Date("2024-01-08"), Period.WEEK, 5, 50, 1, 5),
        createSnapshot(new Date("2024-01-15"), Period.WEEK, 5, 50, 1, 5),
        createSnapshot(new Date("2024-01-22"), Period.WEEK, 5, 50, 1, 5),
      ];

      const result = ActivityAggregationService.calculateTrends(snapshots);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.direction).toBe(TrendDirection.STABLE);
        expect(Math.abs(result.value.velocity)).toBeLessThan(0.1);
      }
    });
  });

  describe("comparePeriods", () => {
    const createContributor = (id: string, timeline: ActivitySnapshot[]) => {
      const emailResult = Email.create(`${id}@example.com`);
      if (!emailResult.ok) {
        throw new Error("Test setup failed");
      }

      const contributorResult = Contributor.create({
        id,
        primaryEmail: emailResult.value,
        mergedEmails: [],
        displayName: `Contributor ${id}`,
        implementationActivity: ImplementationActivity.zero(),
        reviewActivity: ReviewActivity.zero(),
        activityTimeline: timeline,
      });

      if (!contributorResult.ok) {
        throw new Error("Test setup failed");
      }

      return contributorResult.value;
    };

    it("should compare two periods with activity increase", () => {
      const previousRangeResult = DateRange.create(
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );
      const currentRangeResult = DateRange.create(
        new Date("2024-02-01"),
        new Date("2024-02-29"),
      );

      expect(previousRangeResult.ok).toBe(true);
      expect(currentRangeResult.ok).toBe(true);

      if (previousRangeResult.ok && currentRangeResult.ok) {
        const timeline = [
          createSnapshot(new Date("2024-01-15"), Period.DAY, 5, 50, 1, 5), // Previous: score = 5*10+50 + 1*5+5*2 = 115
          createSnapshot(new Date("2024-02-15"), Period.DAY, 10, 100, 2, 10), // Current: score = 10*10+100 + 2*5+10*2 = 230
        ];

        const contributor = createContributor("c1", timeline);

        const result = ActivityAggregationService.comparePeriods(
          currentRangeResult.value,
          previousRangeResult.value,
          [contributor],
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.previousTotal).toBe(115);
          expect(result.value.currentTotal).toBe(230);
          expect(result.value.percentageChange).toBe(100); // 100% increase
          expect(result.value.topMovers).toHaveLength(1);
          expect(result.value.topMovers[0]!.id).toBe("c1");
          expect(result.value.topMovers[0]!.change).toBe(115); // +115
        }
      }
    });

    it("should compare two periods with activity decrease", () => {
      const previousRangeResult = DateRange.create(
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );
      const currentRangeResult = DateRange.create(
        new Date("2024-02-01"),
        new Date("2024-02-29"),
      );

      expect(previousRangeResult.ok).toBe(true);
      expect(currentRangeResult.ok).toBe(true);

      if (previousRangeResult.ok && currentRangeResult.ok) {
        const timeline = [
          createSnapshot(new Date("2024-01-15"), Period.DAY, 10, 100, 2, 10), // Previous: 10*10+100 + 2*5+10*2 = 230
          createSnapshot(new Date("2024-02-15"), Period.DAY, 2, 20, 0, 0), // Current: 2*10+20 + 0 = 40
        ];

        const contributor = createContributor("c1", timeline);

        const result = ActivityAggregationService.comparePeriods(
          currentRangeResult.value,
          previousRangeResult.value,
          [contributor],
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.previousTotal).toBe(230);
          expect(result.value.currentTotal).toBe(40);
          expect(result.value.percentageChange).toBeCloseTo(-82.61, 1); // ~82.6% decrease
          expect(result.value.topMovers[0]!.change).toBe(-190); // -190
        }
      }
    });

    it("should handle multiple contributors and identify top movers", () => {
      const previousRangeResult = DateRange.create(
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );
      const currentRangeResult = DateRange.create(
        new Date("2024-02-01"),
        new Date("2024-02-29"),
      );

      expect(previousRangeResult.ok).toBe(true);
      expect(currentRangeResult.ok).toBe(true);

      if (previousRangeResult.ok && currentRangeResult.ok) {
        const contributor1Timeline = [
          createSnapshot(new Date("2024-01-15"), Period.DAY, 5, 50, 1, 5), // Prev: 5*10+50 + 1*5+5*2 = 115
          createSnapshot(new Date("2024-02-15"), Period.DAY, 15, 150, 3, 15), // Curr: 15*10+150 + 3*5+15*2 = 345
        ];

        const contributor2Timeline = [
          createSnapshot(new Date("2024-01-15"), Period.DAY, 10, 100, 2, 10), // Prev: 10*10+100 + 2*5+10*2 = 230
          createSnapshot(new Date("2024-02-15"), Period.DAY, 2, 20, 0, 0), // Curr: 2*10+20 + 0 = 40
        ];

        const contributor3Timeline = [
          createSnapshot(new Date("2024-01-15"), Period.DAY, 3, 30, 0, 0), // Prev: 3*10+30 + 0 = 60
          createSnapshot(new Date("2024-02-15"), Period.DAY, 3, 30, 0, 0), // Curr: 3*10+30 + 0 = 60
        ];

        const contributors = [
          createContributor("c1", contributor1Timeline),
          createContributor("c2", contributor2Timeline),
          createContributor("c3", contributor3Timeline),
        ];

        const result = ActivityAggregationService.comparePeriods(
          currentRangeResult.value,
          previousRangeResult.value,
          contributors,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.previousTotal).toBe(405); // 115+230+60
          expect(result.value.currentTotal).toBe(445); // 345+40+60
          expect(result.value.topMovers).toHaveLength(3);

          // Top mover should be c1 with +230 (345-115)
          expect(result.value.topMovers[0]!.id).toBe("c1");
          expect(result.value.topMovers[0]!.change).toBe(230);

          // Second should be c2 with -190 (40-230) (biggest absolute change after c1)
          expect(result.value.topMovers[1]!.id).toBe("c2");
          expect(result.value.topMovers[1]!.change).toBe(-190);

          // Third should be c3 with 0
          expect(result.value.topMovers[2]!.id).toBe("c3");
          expect(result.value.topMovers[2]!.change).toBe(0);
        }
      }
    });

    it("should handle zero previous activity", () => {
      const previousRangeResult = DateRange.create(
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );
      const currentRangeResult = DateRange.create(
        new Date("2024-02-01"),
        new Date("2024-02-29"),
      );

      expect(previousRangeResult.ok).toBe(true);
      expect(currentRangeResult.ok).toBe(true);

      if (previousRangeResult.ok && currentRangeResult.ok) {
        const timeline = [
          createSnapshot(new Date("2024-02-15"), Period.DAY, 10, 100, 2, 10), // Only current: 10*10+100 + 2*5+10*2 = 230
        ];

        const contributor = createContributor("c1", timeline);

        const result = ActivityAggregationService.comparePeriods(
          currentRangeResult.value,
          previousRangeResult.value,
          [contributor],
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.previousTotal).toBe(0);
          expect(result.value.currentTotal).toBe(230);
          expect(result.value.percentageChange).toBe(100); // 100% from zero
        }
      }
    });

    it("should limit top movers to 5", () => {
      const previousRangeResult = DateRange.create(
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );
      const currentRangeResult = DateRange.create(
        new Date("2024-02-01"),
        new Date("2024-02-29"),
      );

      expect(previousRangeResult.ok).toBe(true);
      expect(currentRangeResult.ok).toBe(true);

      if (previousRangeResult.ok && currentRangeResult.ok) {
        const contributors = Array.from({ length: 10 }, (_, i) => {
          const timeline = [
            createSnapshot(new Date("2024-01-15"), Period.DAY, 1, 10, 0, 0),
            createSnapshot(
              new Date("2024-02-15"),
              Period.DAY,
              i + 1,
              (i + 1) * 10,
              0,
              0,
            ),
          ];
          return createContributor(`c${i}`, timeline);
        });

        const result = ActivityAggregationService.comparePeriods(
          currentRangeResult.value,
          previousRangeResult.value,
          contributors,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.topMovers).toHaveLength(5); // Limited to 5
        }
      }
    });
  });
});
