import { Result, ok, err } from "@/lib/result";

export class Email {
  private constructor(public readonly value: string) {}

  static create(value: string): Result<Email> {
    // Remove leading/trailing whitespace
    const trimmed = value.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return err(new Error("Invalid email format"));
    }

    // Convert to lowercase
    const normalized = trimmed.toLowerCase();

    // Check maximum length (RFC 5321)
    if (normalized.length > 254) {
      return err(new Error("Email exceeds maximum length of 254 characters"));
    }

    return ok(new Email(normalized));
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
