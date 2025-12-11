/**
 * File exclusion utility for filtering out generated, build, and dependency files
 * from Git analysis metrics.
 */

/**
 * Patterns for files that should be excluded from metrics calculation.
 * These include lock files, build artifacts, dependencies, generated docs, and minified files.
 */
const excludePatterns: RegExp[] = [
  // Lock files
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^Gemfile\.lock$/,
  /^Cargo\.lock$/,
  /^poetry\.lock$/,
  /^composer\.lock$/,

  // Build artifacts and dist directories
  /^dist\//,
  /^build\//,
  /^out\//,
  /^\.next\//,
  /^target\//,
  /^bin\//,
  /^obj\//,

  // Dependencies
  /^node_modules\//,
  /^vendor\//,
  /^\.venv\//,

  // Generated documentation
  /^docs\/api\//,
  /^coverage\//,

  // Minified files
  /\.min\.js$/,
  /\.min\.css$/,

  // Source maps
  /\.map$/,
];

/**
 * Determines whether a file should be excluded from metrics calculation.
 *
 * @param filename - The filename or path to check
 * @returns true if the file should be excluded, false otherwise
 *
 * @example
 * ```typescript
 * shouldExcludeFile('package-lock.json') // true
 * shouldExcludeFile('src/index.ts') // false
 * shouldExcludeFile('dist/bundle.js') // true
 * ```
 */
export const shouldExcludeFile = (filename: string): boolean => {
  return excludePatterns.some((pattern) => pattern.test(filename));
};
