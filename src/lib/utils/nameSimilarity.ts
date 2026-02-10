/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create 2D array for dynamic programming
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0]![j] = j;
  }

  // Fill the dp table
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1, // deletion
        dp[i]![j - 1]! + 1, // insertion
        dp[i - 1]![j - 1]! + cost, // substitution
      );
    }
  }

  return dp[len1]![len2]!;
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 * Based on normalized Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  // Normalize strings: lowercase and trim
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  // Handle identical strings
  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Handle empty strings
  if (normalized1.length === 0 || normalized2.length === 0) {
    return 0.0;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Normalize to 0-1 range (1 = identical, 0 = completely different)
  return 1 - distance / maxLength;
}

/**
 * Check if two names are similar enough to be considered the same person
 * Handles common variations like:
 * - "John Smith" vs "J. Smith"
 * - "Taro Tanaka" vs "Tanaka Taro" (Japanese name order)
 * - "john.doe@company.com" vs "John Doe"
 */
export function areNamesSimilar(
  name1: string,
  name2: string,
  threshold = 0.5,
): boolean {
  // Direct similarity check
  const directSimilarity = calculateSimilarity(name1, name2);
  if (directSimilarity >= threshold) {
    return true;
  }

  // Extract initials and last name patterns
  const normalized1 = name1.toLowerCase().trim();
  const normalized2 = name2.toLowerCase().trim();

  // Check if one is a substring of the other (e.g., "John" in "John Smith")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }

  // Check for initial patterns (e.g., "J. Smith" matches "John Smith")
  // Split by common separators: space, dot, hyphen, underscore
  const words1 = normalized1.split(/[\s.\-_]+/).filter((w) => w.length > 0);
  const words2 = normalized2.split(/[\s.\-_]+/).filter((w) => w.length > 0);

  // If both have at least 2 words, check if last words match and first word starts with same letter
  if (words1.length >= 2 && words2.length >= 2) {
    const lastName1 = words1[words1.length - 1];
    const lastName2 = words2[words2.length - 1];
    const firstName1 = words1[0];
    const firstName2 = words2[0];

    if (
      lastName1 === lastName2 &&
      firstName1 &&
      firstName2 &&
      firstName1[0] === firstName2[0]
    ) {
      return true;
    }
  }

  // Check for reversed name order (Japanese names)
  if (words1.length === 2 && words2.length === 2) {
    const reversed = `${words2[1]} ${words2[0]}`;
    if (calculateSimilarity(normalized1, reversed) >= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two email addresses are from the same domain
 */
export function hasSameEmailDomain(email1: string, email2: string): boolean {
  const domain1 = email1.split("@")[1]?.toLowerCase();
  const domain2 = email2.split("@")[1]?.toLowerCase();

  if (!domain1 || !domain2) {
    return false;
  }

  // Ignore common public email domains
  const publicDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "protonmail.com",
  ];

  if (publicDomains.includes(domain1) || publicDomains.includes(domain2)) {
    return false;
  }

  return domain1 === domain2;
}
