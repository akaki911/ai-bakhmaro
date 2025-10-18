/**
 * Minimal type shims for property-api so builds succeed without external
 * @types packages available.
 */
declare const process: {
  env: Record<string, string | undefined>;
};

declare const console: {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

declare module 'cors' {
  type RequestHandler = (...args: unknown[]) => unknown;
  interface CorsOptions {
    origin?: unknown;
    credentials?: boolean;
  }
  const cors: (options?: CorsOptions) => RequestHandler;
  export default cors;
}

declare module 'helmet' {
  type RequestHandler = (...args: unknown[]) => unknown;
  const helmet: (options?: unknown) => RequestHandler;
  export default helmet;
}

declare module 'morgan' {
  type RequestHandler = (...args: unknown[]) => unknown;
  const morgan: (format: string) => RequestHandler;
  export default morgan;
}
