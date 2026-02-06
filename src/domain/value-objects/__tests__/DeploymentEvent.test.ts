/**
 * Unit tests for DeploymentEvent value object
 */

import { describe, it, expect } from "vitest";
import {
  DeploymentEvent,
  DeploymentSource,
  normalizeTagName,
} from "../DeploymentEvent";
import {
  Release,
  Deployment,
  Tag,
} from "@/domain/interfaces/IGitHubRepository";

describe("DeploymentEvent", () => {
  describe("normalizeTagName", () => {
    it("should remove refs/tags/ prefix", () => {
      expect(normalizeTagName("refs/tags/v1.0.0")).toBe("1.0.0");
    });

    it("should remove leading v", () => {
      expect(normalizeTagName("v1.0.0")).toBe("1.0.0");
    });

    it("should convert to lowercase", () => {
      expect(normalizeTagName("V1.0.0")).toBe("1.0.0");
    });

    it("should handle complex tag names", () => {
      expect(normalizeTagName("refs/tags/v2.3.4-beta")).toBe("2.3.4-beta");
    });

    it("should return null for null input", () => {
      expect(normalizeTagName(null)).toBeNull();
    });
  });

  describe("fromRelease", () => {
    it("should create DeploymentEvent from Release with publishedAt", () => {
      const release: Release = {
        name: "v1.0.0 Release",
        tagName: "v1.0.0",
        createdAt: "2024-01-01T00:00:00Z",
        publishedAt: "2024-01-15T10:00:00Z",
        isPrerelease: false,
        isDraft: false,
      };

      const event = DeploymentEvent.fromRelease(release);

      expect(event.id).toBe("release-v1.0.0");
      expect(event.tagName).toBe("1.0.0");
      expect(event.timestamp).toEqual(new Date("2024-01-15T10:00:00Z"));
      expect(event.source).toBe(DeploymentSource.RELEASE);
      expect(event.displayName).toBe("v1.0.0 Release");
      expect(event.environment).toBeUndefined();
    });

    it("should use createdAt when publishedAt is null", () => {
      const release: Release = {
        name: null,
        tagName: "v1.0.0",
        createdAt: "2024-01-01T00:00:00Z",
        publishedAt: null,
        isPrerelease: false,
        isDraft: false,
      };

      const event = DeploymentEvent.fromRelease(release);

      expect(event.timestamp).toEqual(new Date("2024-01-01T00:00:00Z"));
      expect(event.displayName).toBe("v1.0.0");
    });
  });

  describe("fromDeployment", () => {
    it("should create DeploymentEvent from Deployment", () => {
      const deployment: Deployment = {
        id: "dep-123",
        createdAt: "2024-01-15T10:00:00Z",
        environment: "production",
        state: "success",
        ref: "v1.0.0",
        latestStatus: {
          state: "success",
          createdAt: "2024-01-15T10:05:00Z",
        },
      };

      const event = DeploymentEvent.fromDeployment(deployment);

      expect(event.id).toBe("deployment-dep-123");
      expect(event.tagName).toBe("1.0.0");
      expect(event.timestamp).toEqual(new Date("2024-01-15T10:00:00Z"));
      expect(event.source).toBe(DeploymentSource.DEPLOYMENT);
      expect(event.environment).toBe("production");
      expect(event.displayName).toBe("v1.0.0");
    });

    it("should handle null environment and ref", () => {
      const deployment: Deployment = {
        id: "dep-456",
        createdAt: "2024-01-15T10:00:00Z",
        environment: null,
        state: "success",
        ref: null,
        latestStatus: null,
      };

      const event = DeploymentEvent.fromDeployment(deployment);

      expect(event.environment).toBeUndefined();
      expect(event.tagName).toBeNull();
      expect(event.displayName).toBe("dep-456");
    });
  });

  describe("fromTag", () => {
    it("should create DeploymentEvent from annotated tag", () => {
      const tag: Tag = {
        name: "v1.0.0",
        target: {
          tagger: {
            date: "2024-01-15T10:00:00Z",
          },
        },
      };

      const event = DeploymentEvent.fromTag(tag);

      expect(event.id).toBe("tag-v1.0.0");
      expect(event.tagName).toBe("1.0.0");
      expect(event.timestamp).toEqual(new Date("2024-01-15T10:00:00Z"));
      expect(event.source).toBe(DeploymentSource.TAG);
      expect(event.displayName).toBe("v1.0.0");
    });

    it("should create DeploymentEvent from lightweight tag", () => {
      const tag: Tag = {
        name: "v2.0.0",
        target: {
          committedDate: "2024-01-20T14:00:00Z",
        },
      };

      const event = DeploymentEvent.fromTag(tag);

      expect(event.timestamp).toEqual(new Date("2024-01-20T14:00:00Z"));
    });
  });

  describe("getWeekKey", () => {
    it("should return ISO 8601 week key", () => {
      const release: Release = {
        name: "test",
        tagName: "v1.0.0",
        createdAt: "2024-01-15T10:00:00Z",
        publishedAt: "2024-01-15T10:00:00Z",
        isPrerelease: false,
        isDraft: false,
      };

      const event = DeploymentEvent.fromRelease(release);
      const weekKey = event.getWeekKey();

      // January 15, 2024 is in week 3
      expect(weekKey).toMatch(/^W\d{2}-\d{4}$/);
    });
  });

  describe("getMonthKey", () => {
    it("should return ISO 8601 month key", () => {
      const release: Release = {
        name: "test",
        tagName: "v1.0.0",
        createdAt: "2024-01-15T10:00:00Z",
        publishedAt: "2024-01-15T10:00:00Z",
        isPrerelease: false,
        isDraft: false,
      };

      const event = DeploymentEvent.fromRelease(release);

      expect(event.getMonthKey()).toBe("2024-01");
    });
  });

  describe("isWithinRange", () => {
    const release: Release = {
      name: "test",
      tagName: "v1.0.0",
      createdAt: "2024-01-15T10:00:00Z",
      publishedAt: "2024-01-15T10:00:00Z",
      isPrerelease: false,
      isDraft: false,
    };

    const event = DeploymentEvent.fromRelease(release);

    it("should return true when no range specified", () => {
      expect(event.isWithinRange()).toBe(true);
    });

    it("should return true when within range", () => {
      expect(
        event.isWithinRange(new Date("2024-01-01"), new Date("2024-01-31")),
      ).toBe(true);
    });

    it("should return false when before startDate", () => {
      expect(event.isWithinRange(new Date("2024-02-01"))).toBe(false);
    });

    it("should return false when after endDate", () => {
      expect(event.isWithinRange(undefined, new Date("2024-01-01"))).toBe(
        false,
      );
    });
  });

  describe("compareByTimestamp", () => {
    it("should sort events by timestamp descending", () => {
      const event1 = DeploymentEvent.fromRelease({
        name: "1",
        tagName: "v1.0.0",
        createdAt: "2024-01-15T10:00:00Z",
        publishedAt: "2024-01-15T10:00:00Z",
        isPrerelease: false,
        isDraft: false,
      });

      const event2 = DeploymentEvent.fromRelease({
        name: "2",
        tagName: "v2.0.0",
        createdAt: "2024-01-20T10:00:00Z",
        publishedAt: "2024-01-20T10:00:00Z",
        isPrerelease: false,
        isDraft: false,
      });

      const sorted = [event1, event2].sort(DeploymentEvent.compareByTimestamp);

      expect(sorted[0]).toBe(event2); // Newest first
      expect(sorted[1]).toBe(event1);
    });
  });

  describe("validation", () => {
    it("should throw error for empty id", () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        new DeploymentEvent("", "1.0.0", new Date(), DeploymentSource.RELEASE);
      }).toThrow("id is required");
    });

    it("should throw error for invalid timestamp", () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        new DeploymentEvent(
          "test-id",
          "1.0.0",
          new Date("invalid"),
          DeploymentSource.RELEASE,
        );
      }).toThrow("valid timestamp is required");
    });
  });
});
