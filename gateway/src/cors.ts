type OriginCallback = (err: Error | null, allow?: boolean) => void;

export type OriginValidator = (origin: string | undefined, callback: OriginCallback) => void;

export const buildAllowedOriginsSet = (origins: string): Set<string> => {
  return new Set(
    origins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
};

type CreateValidatorOptions = {
  errorMessage?: (origin: string) => string;
};

export const createCorsOriginValidator = (
  allowedOrigins: Set<string>,
  options: CreateValidatorOptions = {},
): OriginValidator => {
  const { errorMessage } = options;

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    const message = errorMessage?.(origin) ?? `Origin ${origin} is not allowed by CORS policy`;
    callback(new Error(message));
  };
};
