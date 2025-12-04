import { describe, it, expect } from "vitest";
import { Email } from "@/domain/value-objects/Email";

describe("Email", () => {
  describe("create", () => {
    it("should create valid email", () => {
      const result = Email.create("user@example.com");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe("user@example.com");
      }
    });

    it("should normalize email to lowercase", () => {
      const result = Email.create("USER@EXAMPLE.COM");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe("user@example.com");
      }
    });

    it("should trim whitespace", () => {
      const result = Email.create("  user@example.com  ");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe("user@example.com");
      }
    });

    it("should reject invalid email format - missing @", () => {
      const result = Email.create("userexample.com");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Invalid email format");
      }
    });

    it("should reject invalid email format - missing domain", () => {
      const result = Email.create("user@");

      expect(result.ok).toBe(false);
    });

    it("should reject invalid email format - missing TLD", () => {
      const result = Email.create("user@example");

      expect(result.ok).toBe(false);
    });

    it("should reject email exceeding 254 characters", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = Email.create(longEmail);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("exceeds maximum length");
      }
    });

    it("should accept email with 254 characters", () => {
      // Create exactly 254 character email: 242 chars + "@example.com" (12 chars)
      const localPart = "a".repeat(242);
      const email = `${localPart}@example.com`;
      const result = Email.create(email);

      expect(result.ok).toBe(true);
    });
  });

  describe("equals", () => {
    it("should return true for equal emails", () => {
      const email1Result = Email.create("user@example.com");
      const email2Result = Email.create("user@example.com");

      expect(email1Result.ok).toBe(true);
      expect(email2Result.ok).toBe(true);

      if (email1Result.ok && email2Result.ok) {
        expect(email1Result.value.equals(email2Result.value)).toBe(true);
      }
    });

    it("should return true for case-insensitive equal emails", () => {
      const email1Result = Email.create("USER@EXAMPLE.COM");
      const email2Result = Email.create("user@example.com");

      expect(email1Result.ok).toBe(true);
      expect(email2Result.ok).toBe(true);

      if (email1Result.ok && email2Result.ok) {
        expect(email1Result.value.equals(email2Result.value)).toBe(true);
      }
    });

    it("should return false for different emails", () => {
      const email1Result = Email.create("user1@example.com");
      const email2Result = Email.create("user2@example.com");

      expect(email1Result.ok).toBe(true);
      expect(email2Result.ok).toBe(true);

      if (email1Result.ok && email2Result.ok) {
        expect(email1Result.value.equals(email2Result.value)).toBe(false);
      }
    });
  });
});
