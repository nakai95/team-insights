import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextAuthAdapter } from "../NextAuthAdapter";

// Mock auth function
vi.mock("../auth.config", () => ({
  auth: vi.fn(),
}));

describe("NextAuthAdapter", () => {
  let adapter: NextAuthAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new NextAuthAdapter();
  });

  describe("getAccessToken", () => {
    it("should return access token from valid session", async () => {
      const { auth } = await import("../auth.config");
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "123",
          name: "Test User",
          email: "test@example.com",
        },
        accessToken: "ghp_validToken123",
        expires: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("ghp_validToken123");
      }
    });

    it("should return error when no session exists", async () => {
      const { auth } = await import("../auth.config");
      vi.mocked(auth).mockResolvedValue(null as any);

      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No active session");
      }
    });

    it("should return error when session has error field", async () => {
      const { auth } = await import("../auth.config");
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "123",
          name: "Test User",
        },
        accessToken: "ghp_token",
        expires: new Date(Date.now() + 86400000).toISOString(),
        error: "RefreshAccessTokenError",
      } as any);

      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("Session error");
        expect(result.error.message).toContain("RefreshAccessTokenError");
      }
    });

    it("should return error when access token is missing", async () => {
      const { auth } = await import("../auth.config");
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "123",
          name: "Test User",
          email: "test@example.com",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
        // accessToken is missing
      } as any);

      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No access token in session");
      }
    });

    it("should return error when session exists but accessToken is undefined", async () => {
      const { auth } = await import("../auth.config");
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "123",
          name: "Test User",
        },
        accessToken: undefined,
        expires: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const result = await adapter.getAccessToken();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("No access token in session");
      }
    });

    it("should handle multiple successful calls", async () => {
      const { auth } = await import("../auth.config");
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "123",
          name: "Test User",
        },
        accessToken: "ghp_consistentToken",
        expires: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const result1 = await adapter.getAccessToken();
      const result2 = await adapter.getAccessToken();

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok && result2.ok) {
        expect(result1.value).toBe("ghp_consistentToken");
        expect(result2.value).toBe("ghp_consistentToken");
      }
    });
  });
});
