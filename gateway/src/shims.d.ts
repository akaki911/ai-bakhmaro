/**
 * Minimal type shims so the gateway can compile in environments where the
 * official @types packages are unavailable. The definitions intentionally cover
 * only the APIs consumed by the codebase.
 */
declare const process: {
  env: Record<string, string | undefined>;
};

declare const console: {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number): unknown;
declare function clearTimeout(handle: unknown): void;

declare module 'node:path' {
  const path: {
    resolve: (...segments: string[]) => string;
    dirname: (value: string) => string;
    join: (...segments: string[]) => string;
  };
  export default path;
}

declare module 'node:url' {
  const fileURLToPath: (value: string) => string;
  export { fileURLToPath };
}

declare module 'node:crypto' {
  const randomUUID: () => string;
  export { randomUUID };
}

declare module 'node:fs' {
  const existsSync: (path: string) => boolean;
  export { existsSync };
}

declare module 'http' {
  interface ClientRequest {
    setHeader(name: string, value: string): void;
  }
  export { ClientRequest };
}

declare module 'compression' {
  type RequestHandler = (...args: unknown[]) => unknown;
  const compression: (options?: unknown) => RequestHandler;
  export default compression;
}

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

declare module 'http-proxy-middleware' {
  type RequestHandler = (...args: unknown[]) => unknown;
  interface Options {
    target?: string;
    changeOrigin?: boolean;
    secure?: boolean;
    ws?: boolean;
    logLevel?: string;
    proxyTimeout?: number;
    timeout?: number;
    pathRewrite?: Record<string, string>;
    onProxyReq?: (...args: unknown[]) => void;
    onProxyRes?: (...args: unknown[]) => void;
    onError?: (...args: unknown[]) => void;
  }
  function createProxyMiddleware(options: Options): RequestHandler;
  function createProxyMiddleware(path: string, options: Options): RequestHandler;
  export { createProxyMiddleware, Options };
}
