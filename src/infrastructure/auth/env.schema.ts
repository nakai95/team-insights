import { z } from "zod";

/**
 * Environment Variable Validation Schema
 *
 * Supports two authentication modes:
 * 1. OAuth Mode (default): Requires AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH_SECRET
 * 2. Environment Token Mode (dev-only): Requires GITHUB_TOKEN
 *
 * Environment Variables:
 * - GITHUB_TOKEN: (Optional, dev-only) GitHub Personal Access Token
 * - AUTH_GITHUB_ID: GitHub OAuth app client ID (required if GITHUB_TOKEN not set)
 * - AUTH_GITHUB_SECRET: GitHub OAuth app client secret (required if GITHUB_TOKEN not set)
 * - AUTH_SECRET: Secret for JWT encryption (required if GITHUB_TOKEN not set)
 * - NEXTAUTH_URL: (Optional) Base URL for OAuth callbacks
 */
const baseAuthEnvSchema = z.object({
  GITHUB_TOKEN: z
    .string()
    .regex(
      /^(ghp_|gho_|ghs_|github_pat_)[a-zA-Z0-9_]+$/,
      "Invalid GitHub token format. Token must start with ghp_, gho_, ghs_, or github_pat_",
    )
    .optional()
    .describe("GitHub Personal Access Token for development (dev-only)"),

  AUTH_GITHUB_ID: z
    .string()
    .optional()
    .describe("GitHub OAuth application client ID"),

  AUTH_GITHUB_SECRET: z
    .string()
    .optional()
    .describe("GitHub OAuth application client secret"),

  AUTH_SECRET: z
    .string()
    .optional()
    .describe(
      "Secret key for encrypting JWT sessions (generate with: openssl rand -base64 32)",
    ),

  NEXTAUTH_URL: z
    .url("NEXTAUTH_URL must be a valid URL")
    .optional()
    .describe("Base URL for OAuth callbacks (auto-detected in development)"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development")
    .describe("Node environment"),
});

/**
 * Refined schema with conditional validation
 */
export const authEnvSchema = baseAuthEnvSchema.superRefine((data, ctx) => {
  const hasGitHubToken = !!data.GITHUB_TOKEN;
  const nodeEnv = data.NODE_ENV || process.env.NODE_ENV || "development";

  // If GITHUB_TOKEN is set, enforce development mode
  if (hasGitHubToken && nodeEnv !== "development") {
    ctx.addIssue({
      code: "custom",
      message:
        "GITHUB_TOKEN can only be used in development mode. Remove GITHUB_TOKEN or set NODE_ENV=development",
      path: ["GITHUB_TOKEN"],
    });
  }

  // If GITHUB_TOKEN is NOT set, require OAuth credentials
  if (!hasGitHubToken) {
    if (!data.AUTH_GITHUB_ID || data.AUTH_GITHUB_ID.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "AUTH_GITHUB_ID is required when GITHUB_TOKEN is not set. Either set GITHUB_TOKEN (dev-only) or configure OAuth credentials.",
        path: ["AUTH_GITHUB_ID"],
      });
    }

    if (!data.AUTH_GITHUB_SECRET || data.AUTH_GITHUB_SECRET.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "AUTH_GITHUB_SECRET is required when GITHUB_TOKEN is not set. Either set GITHUB_TOKEN (dev-only) or configure OAuth credentials.",
        path: ["AUTH_GITHUB_SECRET"],
      });
    }

    if (!data.AUTH_SECRET || data.AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: "custom",
        message:
          "AUTH_SECRET is required (min 32 characters) when GITHUB_TOKEN is not set. Either set GITHUB_TOKEN (dev-only) or configure OAuth credentials.",
        path: ["AUTH_SECRET"],
      });
    }
  }
});

/**
 * Inferred TypeScript type from the Zod schema
 */
export type AuthEnv = z.infer<typeof authEnvSchema>;

/**
 * Validate authentication environment variables.
 *
 * Reads variables from process.env and validates against the schema.
 * Throws a descriptive error if validation fails.
 *
 * @returns Validated and typed environment configuration
 * @throws ZodError with detailed validation messages if any variable is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const env = validateAuthEnv();
 *   console.log("OAuth configured:", env.AUTH_GITHUB_ID);
 * } catch (error) {
 *   console.error("Environment validation failed:", error);
 *   process.exit(1);
 * }
 * ```
 */
export function validateAuthEnv(): AuthEnv {
  return authEnvSchema.parse({
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}

/**
 * Safe validation that returns a Result type instead of throwing.
 *
 * @returns Result containing validated environment or validation errors
 *
 * @example
 * ```typescript
 * const result = safeValidateAuthEnv();
 * if (!result.ok) {
 *   console.error("Environment validation failed:", result.error);
 *   return;
 * }
 * const env = result.value;
 * ```
 */
export function safeValidateAuthEnv():
  | {
      ok: true;
      value: AuthEnv;
    }
  | {
      ok: false;
      error: z.ZodError;
    } {
  const result = authEnvSchema.safeParse({
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (result.success) {
    return { ok: true, value: result.data };
  } else {
    return { ok: false, error: result.error };
  }
}

/**
 * Check if environment token mode is active.
 *
 * Returns true if GITHUB_TOKEN is set and NODE_ENV is development.
 *
 * @returns True if using environment token authentication
 *
 * @example
 * ```typescript
 * if (isEnvTokenMode()) {
 *   console.log("Using environment token authentication");
 * }
 * ```
 */
export function isEnvTokenMode(): boolean {
  return (
    !!process.env.GITHUB_TOKEN &&
    (process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === undefined)
  );
}
