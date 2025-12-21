import { z } from "zod";

/**
 * Environment Variable Validation Schema
 *
 * Validates required OAuth configuration from environment variables.
 * Ensures all required variables are present and meet minimum requirements.
 *
 * Required Environment Variables:
 * - AUTH_GITHUB_ID: GitHub OAuth app client ID
 * - AUTH_GITHUB_SECRET: GitHub OAuth app client secret
 * - AUTH_SECRET: Secret for JWT encryption (min 32 characters)
 * - NEXTAUTH_URL: (Optional) Base URL for OAuth callbacks
 */
export const authEnvSchema = z.object({
  AUTH_GITHUB_ID: z
    .string()
    .min(1, "GitHub OAuth client ID is required")
    .describe("GitHub OAuth application client ID"),

  AUTH_GITHUB_SECRET: z
    .string()
    .min(1, "GitHub OAuth client secret is required")
    .describe("GitHub OAuth application client secret"),

  AUTH_SECRET: z
    .string()
    .min(
      32,
      "Auth secret must be at least 32 characters for secure JWT encryption",
    )
    .describe(
      "Secret key for encrypting JWT sessions (generate with: openssl rand -base64 32)",
    ),

  NEXTAUTH_URL: z
    .url("NEXTAUTH_URL must be a valid URL")
    .optional()
    .describe("Base URL for OAuth callbacks (auto-detected in development)"),
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
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
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
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });

  if (result.success) {
    return { ok: true, value: result.data };
  } else {
    return { ok: false, error: result.error };
  }
}
