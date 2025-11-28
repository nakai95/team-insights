const DEBUG = process.env.DEBUG === "true";

export const logger = {
  debug: (message: string, ...args: unknown[]): void => {
    if (DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: unknown[]): void => {
    console.log(`[INFO] ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  error: (message: string, error?: unknown): void => {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error(`[ERROR] ${message}`, error);
    }
  },
};
