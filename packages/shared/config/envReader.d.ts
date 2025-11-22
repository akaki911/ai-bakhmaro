export type NormalisedNodeEnv = 'development' | 'test' | 'production';

type BaseOptions<T> = {
  defaultValue?: T;
  required?: boolean;
  allowEmpty?: boolean;
  name?: string;
  validate?: (value: T) => void;
};

type NumberOptions = BaseOptions<number> & {
  integer?: boolean;
};

type BooleanOptions = BaseOptions<boolean> & {
  truthyValues?: string[];
  falsyValues?: string[];
};

type CsvOptions = BaseOptions<string[]> & {
  delimiter?: string | RegExp;
  unique?: boolean;
};

type JsonOptions<T> = BaseOptions<T> & {
  reviver?: Parameters<typeof JSON.parse>[1];
};

type UrlOptions = BaseOptions<string>;

export declare const normalizeNodeEnv: (
  value: string | undefined | null,
  fallback?: NormalisedNodeEnv,
) => NormalisedNodeEnv;

export declare const readEnvString: (key: string, options?: BaseOptions<string>) => string | undefined;
export declare const readEnvNumber: (key: string, options?: NumberOptions) => number | undefined;
export declare const readEnvBoolean: (key: string, options?: BooleanOptions) => boolean | undefined;
export declare const readEnvCsv: (key: string, options?: CsvOptions) => string[] | undefined;
export declare const readEnvJson: <T = unknown>(key: string, options?: JsonOptions<T>) => T | undefined;
export declare const readEnvUrl: (key: string, options?: UrlOptions) => string | undefined;
export declare const requireEnv: (key: string) => string;

export declare const readEnv: {
  string: typeof readEnvString;
  number: typeof readEnvNumber;
  boolean: typeof readEnvBoolean;
  csv: typeof readEnvCsv;
  json: typeof readEnvJson;
  url: typeof readEnvUrl;
};
