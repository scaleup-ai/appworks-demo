// Lightweight logger wrapper for the demo app; keeps a single import site
// in case we want to swap implementation later.
const logger = {
  warn: (...args: unknown[]) => {
    console.warn(...(args as any));
  },
  error: (...args: unknown[]) => {
    console.error(...(args as any));
  },
};

export default logger;
