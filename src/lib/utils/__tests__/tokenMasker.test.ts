import { describe, it, expect } from "vitest";
import { maskToken, redactTokens } from "../tokenMasker";

describe("maskToken", () => {
  it("masks tokens longer than 8 characters", () => {
    const token = "ghp_1234567890abcdefghij";
    const result = maskToken(token);
    expect(result).toBe("ghp_****...****ghij");
  });

  it("fully masks short tokens (8 characters or less)", () => {
    const token = "short";
    const result = maskToken(token);
    expect(result).toBe("****");
  });
});

describe("redactTokens", () => {
  it("redacts GitHub token patterns from text", () => {
    const text = "Using token ghp_1234567890abcdefghij for authentication";
    const result = redactTokens(text);
    expect(result).toContain("ghp_****...****ghij");
    expect(result).not.toContain("ghp_1234567890abcdefghij");
  });

  it("returns unchanged text when no tokens found", () => {
    const text = "No tokens here";
    const result = redactTokens(text);
    expect(result).toBe(text);
  });
});
