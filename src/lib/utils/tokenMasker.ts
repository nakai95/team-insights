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

/**
 * Redact tokens from text for safe logging
 * Replaces any token-like patterns with masked versions
 */
export function redactTokens(text: string): string {
  // Match GitHub token patterns: ghp_, gho_, ghu_, ghs_, ghr_
  const tokenPattern = /(gh[pousr]_[a-zA-Z0-9_]{20,100})/g;

  return text.replace(tokenPattern, (match) => maskToken(match));
}
