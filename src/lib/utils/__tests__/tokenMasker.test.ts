import { describe, it, expect } from "vitest";
import { maskToken } from "../tokenMasker";

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
