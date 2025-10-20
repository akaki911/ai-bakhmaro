export declare const setupGlobalFetch: (
  globalWindow: Window & typeof globalThis
) => () => void;

export declare const __testables: {
  extractRequestUrl: (input: RequestInfo | URL) => string | undefined;
  shouldForceOmitCredentialsFactory: (
    globalWindow: Window & typeof globalThis
  ) => (requestUrl?: string | undefined) => boolean;
  isSameOriginRequestFactory: (
    globalWindow: Window & typeof globalThis
  ) => (requestUrl?: string | undefined) => boolean;
};
