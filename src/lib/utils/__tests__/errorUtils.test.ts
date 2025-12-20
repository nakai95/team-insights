import { describe, expect, it } from "vitest";
import { getErrorMessage } from "../errorUtils";

describe("getErrorMessage", () => {
  it.each([
    ["Error instance", new Error("Test error"), "Test error"],
    ["TypeError instance", new TypeError("Type error"), "Type error"],
    ["Custom Error instance", new Error("Custom message"), "Custom message"],
    ["string", "String error", "String error"],
    ["number", 42, "42"],
    ["boolean true", true, "true"],
    ["boolean false", false, "false"],
    ["null", null, "null"],
    ["undefined", undefined, "undefined"],
    ["object", { message: "Object error" }, "[object Object]"],
    ["array", ["error", "message"], "error,message"],
  ])("should handle %s: %s", (_description, input, expected) => {
    expect(getErrorMessage(input)).toBe(expected);
  });
});
