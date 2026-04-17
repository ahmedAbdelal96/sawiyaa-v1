export const logger = {
  info(message: string, context?: unknown) {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, context ?? "");
    }
  },
  warn(message: string, context?: unknown) {
    console.warn(`[WARN] ${message}`, context ?? "");
  },
  error(message: string, context?: unknown) {
    console.error(`[ERROR] ${message}`, context ?? "");
  },
};

