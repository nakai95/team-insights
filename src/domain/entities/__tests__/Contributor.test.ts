import { describe, it, expect } from "vitest";
import { Contributor } from "@/domain/entities/Contributor";
import { Email } from "@/domain/value-objects/Email";
import { ImplementationActivity } from "@/domain/value-objects/ImplementationActivity";
import { ReviewActivity } from "@/domain/value-objects/ReviewActivity";
import { ActivitySnapshot } from "@/domain/value-objects/ActivitySnapshot";
import { Period } from "@/domain/types";

describe("Contributor", () => {
  const createValidParams = () => {
    const primaryEmailResult = Email.create("developer@example.com");
    const email2Result = Email.create("dev@company.com");

    if (!primaryEmailResult.ok || !email2Result.ok) {
      throw new Error("Test setup failed");
    }

    return {
      id: "contributor-123",
      primaryEmail: primaryEmailResult.value,
      mergedEmails: [email2Result.value],
      displayName: "John Developer",
      implementationActivity: ImplementationActivity.zero(),
      reviewActivity: ReviewActivity.zero(),
      activityTimeline: [],
    };
  };

  describe("create", () => {
    it("should create valid contributor", () => {
      const params = createValidParams();
      const result = Contributor.create(params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("contributor-123");
        expect(result.value.displayName).toBe("John Developer");
        expect(result.value.primaryEmail.value).toBe("developer@example.com");
        expect(result.value.mergedEmails).toHaveLength(1);
      }
    });

    it("should reject empty ID", () => {
      const params = createValidParams();
      params.id = "";

      const result = Contributor.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("ID cannot be empty");
      }
    });

    it("should reject empty display name", () => {
      const params = createValidParams();
      params.displayName = "";

      const result = Contributor.create(params);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Display name cannot be empty");
      }
    });

    it("should reject merged email duplicating primary", () => {
      const primaryEmailResult = Email.create("developer@example.com");
      const duplicateEmailResult = Email.create("developer@example.com");

      expect(primaryEmailResult.ok).toBe(true);
      expect(duplicateEmailResult.ok).toBe(true);

      if (primaryEmailResult.ok && duplicateEmailResult.ok) {
        const params = createValidParams();
        params.primaryEmail = primaryEmailResult.value;
        params.mergedEmails = [duplicateEmailResult.value];

        const result = Contributor.create(params);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Merged emails must not duplicate primary email",
          );
        }
      }
    });

    it("should reject duplicate emails in merged list", () => {
      const primaryEmailResult = Email.create("primary@example.com");
      const email1Result = Email.create("dev@example.com");
      const email2Result = Email.create("dev@example.com");

      expect(primaryEmailResult.ok).toBe(true);
      expect(email1Result.ok).toBe(true);
      expect(email2Result.ok).toBe(true);

      if (primaryEmailResult.ok && email1Result.ok && email2Result.ok) {
        const params = createValidParams();
        params.primaryEmail = primaryEmailResult.value;
        params.mergedEmails = [email1Result.value, email2Result.value];

        const result = Contributor.create(params);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("All emails must be unique");
        }
      }
    });

    it("should reject unsorted activity timeline", () => {
      const snapshot1Result = ActivitySnapshot.create(
        new Date("2024-01-15"),
        Period.DAY,
        ImplementationActivity.zero(),
        ReviewActivity.zero(),
      );

      const snapshot2Result = ActivitySnapshot.create(
        new Date("2024-01-10"), // Earlier date
        Period.DAY,
        ImplementationActivity.zero(),
        ReviewActivity.zero(),
      );

      expect(snapshot1Result.ok).toBe(true);
      expect(snapshot2Result.ok).toBe(true);

      if (snapshot1Result.ok && snapshot2Result.ok) {
        const params = {
          ...createValidParams(),
          activityTimeline: [snapshot1Result.value, snapshot2Result.value],
        };

        const result = Contributor.create(params);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain(
            "Activity timeline must be sorted chronologically",
          );
        }
      }
    });

    it("should accept sorted activity timeline", () => {
      const snapshot1Result = ActivitySnapshot.create(
        new Date("2024-01-10"),
        Period.DAY,
        ImplementationActivity.zero(),
        ReviewActivity.zero(),
      );

      const snapshot2Result = ActivitySnapshot.create(
        new Date("2024-01-15"),
        Period.DAY,
        ImplementationActivity.zero(),
        ReviewActivity.zero(),
      );

      expect(snapshot1Result.ok).toBe(true);
      expect(snapshot2Result.ok).toBe(true);

      if (snapshot1Result.ok && snapshot2Result.ok) {
        const params = {
          ...createValidParams(),
          activityTimeline: [snapshot1Result.value, snapshot2Result.value],
        };

        const result = Contributor.create(params);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.activityTimeline).toHaveLength(2);
        }
      }
    });

    it("should create contributor without merged emails", () => {
      const params = createValidParams();
      params.mergedEmails = [];

      const result = Contributor.create(params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.mergedEmails).toHaveLength(0);
      }
    });
  });

  describe("allEmails", () => {
    it("should return primary and merged emails", () => {
      const params = createValidParams();
      const result = Contributor.create(params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const allEmails = result.value.allEmails;
        expect(allEmails).toHaveLength(2); // primary + 1 merged
        expect(allEmails[0]?.value).toBe("developer@example.com");
        expect(allEmails[1]?.value).toBe("dev@company.com");
      }
    });

    it("should return only primary email when no merged emails", () => {
      const params = createValidParams();
      params.mergedEmails = [];

      const result = Contributor.create(params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const allEmails = result.value.allEmails;
        expect(allEmails).toHaveLength(1);
        expect(allEmails[0]?.value).toBe("developer@example.com");
      }
    });
  });
});
