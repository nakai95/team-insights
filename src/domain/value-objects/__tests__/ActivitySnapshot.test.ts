import { describe, it, expect } from "vitest";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { Period } from "@/domain/types";

describe("ActivitySnapshot", () => {
  describe("create", () => {
    it("should create valid activity snapshot", () => {
      const implActivity = ImplementationActivity.zero();
      const revActivity = ReviewActivity.zero();
      const date = new Date("2024-01-01");

      const result = ActivitySnapshot.create(
        date,
        Period.DAY,
        implActivity,
        revActivity,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.date).toEqual(date);
        expect(result.value.period).toBe(Period.DAY);
        expect(result.value.implementationActivity).toBe(implActivity);
        expect(result.value.reviewActivity).toBe(revActivity);
      }
    });

    it.each([
      { period: Period.DAY, name: "DAY" },
      { period: Period.WEEK, name: "WEEK" },
      { period: Period.MONTH, name: "MONTH" },
    ])("should accept $name period", ({ period }) => {
      const implActivity = ImplementationActivity.zero();
      const revActivity = ReviewActivity.zero();
      const date = new Date("2024-01-01");

      const result = ActivitySnapshot.create(
        date,
        period,
        implActivity,
        revActivity,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.period).toBe(period);
      }
    });

    it("should create snapshot with non-zero activities", () => {
      const implActivityResult = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 50,
        linesModified: 30,
        filesChanged: 5,
      });

      const revActivityResult = ReviewActivity.create({
        pullRequestCount: 5,
        reviewCommentCount: 20,
        pullRequestsReviewed: 10,
      });

      expect(implActivityResult.ok).toBe(true);
      expect(revActivityResult.ok).toBe(true);

      if (implActivityResult.ok && revActivityResult.ok) {
        const date = new Date("2024-01-01");
        const result = ActivitySnapshot.create(
          date,
          Period.WEEK,
          implActivityResult.value,
          revActivityResult.value,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.implementationActivity.commitCount).toBe(10);
          expect(result.value.reviewActivity.pullRequestCount).toBe(5);
        }
      }
    });
  });
});
