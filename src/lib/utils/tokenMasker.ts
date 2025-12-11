/**
 * Mask sensitive tokens for logging
 * Shows first 4 and last 4 characters, masks the rest
 * Example: "ghp_1234567890abcdefghij" -> "ghp_****...****ghij"
 */
export function maskToken(token: string): string {
  if (token.length <= 8) {
    return "****";
  }

  const visibleChars = 4;
  const start = token.substring(0, visibleChars);
  const end = token.substring(token.length - visibleChars);

  return `${start}****...****${end}`;
}
