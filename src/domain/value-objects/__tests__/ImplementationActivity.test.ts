import { describe, it, expect } from "vitest";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";

describe("ImplementationActivity", () => {
  describe("create", () => {
    it("should create valid implementation activity", () => {
      const result = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 50,
        linesModified: 30,
        filesChanged: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commitCount).toBe(10);
        expect(result.value.linesAdded).toBe(100);
        expect(result.value.linesDeleted).toBe(50);
        expect(result.value.linesModified).toBe(30);
        expect(result.value.filesChanged).toBe(5);
      }
    });

    it("should create activity with zero values", () => {
      const result = ImplementationActivity.create({
        commitCount: 0,
        linesAdded: 0,
        linesDeleted: 0,
        linesModified: 0,
        filesChanged: 0,
      });

      expect(result.ok).toBe(true);
    });

    it.each([
      { field: "commitCount", value: -1, name: "commit count" },
      { field: "linesAdded", value: -100, name: "lines added" },
      { field: "linesDeleted", value: -50, name: "lines deleted" },
      { field: "linesModified", value: -30, name: "lines modified" },
      { field: "filesChanged", value: -5, name: "files changed" },
    ])("should reject negative $name", ({ field, value }) => {
      const params = {
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 50,
        linesModified: 30,
        filesChanged: 5,
        [field]: value,
      };

      const result = ImplementationActivity.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("must be non-negative");
      }
    });

    it.each([
      { field: "commitCount", value: 10.5, name: "commit count" },
      { field: "linesAdded", value: 100.7, name: "lines added" },
      { field: "linesDeleted", value: 50.3, name: "lines deleted" },
      { field: "linesModified", value: 30.1, name: "lines modified" },
      { field: "filesChanged", value: 5.9, name: "files changed" },
    ])("should reject non-integer $name", ({ field, value }) => {
      const params = {
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 50,
        linesModified: 30,
        filesChanged: 5,
        [field]: value,
      };

      const result = ImplementationActivity.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("must be integers");
      }
    });
  });

  describe("zero", () => {
    it("should create activity with all zero values", () => {
      const activity = ImplementationActivity.zero();

      expect(activity.commitCount).toBe(0);
      expect(activity.linesAdded).toBe(0);
      expect(activity.linesDeleted).toBe(0);
      expect(activity.linesModified).toBe(0);
      expect(activity.filesChanged).toBe(0);
    });
  });

  describe("totalLineChanges", () => {
    it("should calculate total line changes", () => {
      const result = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 50,
        linesModified: 30,
        filesChanged: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalLineChanges).toBe(150); // 100 + 50
      }
    });

    it("should return 0 for zero activity", () => {
      const activity = ImplementationActivity.zero();
      expect(activity.totalLineChanges).toBe(0);
    });
  });

  describe("netLineChanges", () => {
    it("should calculate net line changes", () => {
      const result = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 50,
        linesModified: 30,
        filesChanged: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.netLineChanges).toBe(50); // 100 - 50
      }
    });

    it("should return negative for more deletions", () => {
      const result = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 50,
        linesDeleted: 100,
        linesModified: 30,
        filesChanged: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.netLineChanges).toBe(-50); // 50 - 100
      }
    });
  });

  describe("activityScore", () => {
    it("should calculate activity score", () => {
      const result = ImplementationActivity.create({
        commitCount: 10,
        linesAdded: 100,
        linesDeleted: 50,
        linesModified: 30,
        filesChanged: 5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Score = commitCount * 10 + totalLineChanges
        // Score = 10 * 10 + 150 = 250
        expect(result.value.activityScore).toBe(250);
      }
    });

    it("should return 0 for zero activity", () => {
      const activity = ImplementationActivity.zero();
      expect(activity.activityScore).toBe(0);
    });
  });
});
