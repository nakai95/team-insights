/**
 * Utility functions for error handling
 */

/**
 * Extracts a string message from an unknown error object.
 * Safely handles both Error instances and other types of thrown values.
 *
 * @param error - The error object (unknown type)
 * @returns A string representation of the error message
 *
 * @example
 * ```typescript
 * try {
 *   // some code
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   console.error(message);
 * }
 * ```
 */
export const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};
