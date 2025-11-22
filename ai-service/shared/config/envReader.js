'use strict';

const hasValue = (value, allowEmpty) => {
  if (value === undefined || value === null) {
    return false;
  }
  if (allowEmpty) {
    return true;
  }
  return String(value).trim().length > 0;
};

const normaliseKey = (key, name) => (name || key);

const readEnvValue = (key, options) => {
  const { defaultValue, required = false, allowEmpty = false, name, validate, parser } = options;
  const raw = process.env[key];

  if (!hasValue(raw, allowEmpty)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    if (required) {
      throw new Error(`Missing required environment variable: ${normaliseKey(key, name)}`);
    }

    return undefined;
  }

  const prepared = allowEmpty ? String(raw) : String(raw).trim();
  const parsed = parser(prepared);

  if (typeof validate === 'function') {
    validate(parsed);
  }

  return parsed;
};

const normalizeNodeEnv = (value, fallback = 'development') => {
  if (!value) {
    return fallback;
  }

  const normalised = String(value).trim().toLowerCase();

  if (normalised === 'production') {
    return 'production';
  }

  if (normalised === 'test') {
    return 'test';
  }

  return 'development';
};

const readEnvString = (key, options = {}) =>
  readEnvValue(key, {
    ...options,
    parser: (raw) => raw,
  });

const readEnvNumber = (key, options = {}) =>
  readEnvValue(key, {
    ...options,
    parser: (raw) => {
      const value = Number(raw);
      if (Number.isNaN(value)) {
        throw new Error(`Invalid numeric value for environment variable: ${normaliseKey(key, options.name)}`);
      }

      if (options.integer && !Number.isInteger(value)) {
        throw new Error(`Environment variable must be an integer: ${normaliseKey(key, options.name)}`);
      }

      return value;
    },
  });

const readEnvBoolean = (key, options = {}) => {
  const truthyValues = (options.truthyValues || ['true', '1', 'yes', 'on']).map((entry) => entry.toLowerCase());
  const falsyValues = (options.falsyValues || ['false', '0', 'no', 'off']).map((entry) => entry.toLowerCase());

  return readEnvValue(key, {
    ...options,
    parser: (raw) => {
      const lowered = raw.trim().toLowerCase();

      if (truthyValues.includes(lowered)) {
        return true;
      }

      if (falsyValues.includes(lowered)) {
        return false;
      }

      throw new Error(`Invalid boolean value for environment variable: ${normaliseKey(key, options.name)}`);
    },
  });
};

const readEnvCsv = (key, options = {}) => {
  const delimiter = options.delimiter ?? ',';

  return readEnvValue(key, {
    ...options,
    allowEmpty: options.allowEmpty ?? true,
    parser: (raw) => {
      const parts = raw
        .split(delimiter)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

      if (options.unique) {
        return Array.from(new Set(parts));
      }

      return parts;
    },
  });
};

const readEnvJson = (key, options = {}) =>
  readEnvValue(key, {
    ...options,
    parser: (raw) => {
      try {
        return JSON.parse(raw, options.reviver);
      } catch (error) {
        throw new Error(
          `Invalid JSON for environment variable ${normaliseKey(key, options.name)}: ${error.message}`,
        );
      }
    },
  });

const readEnvUrl = (key, options = {}) =>
  readEnvValue(key, {
    ...options,
    parser: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed && !options.allowEmpty) {
        throw new Error(`Missing required URL value for environment variable: ${normaliseKey(key, options.name)}`);
      }

      if (trimmed) {
        // eslint-disable-next-line no-new
        new URL(trimmed);
      }

      return trimmed;
    },
  });

const requireEnv = (key) => {
  const value = readEnvString(key, { required: true });
  if (typeof value !== 'string') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const readEnv = {
  string: readEnvString,
  number: readEnvNumber,
  boolean: readEnvBoolean,
  csv: readEnvCsv,
  json: readEnvJson,
  url: readEnvUrl,
};

module.exports = {
  normalizeNodeEnv,
  readEnvString,
  readEnvNumber,
  readEnvBoolean,
  readEnvCsv,
  readEnvJson,
  readEnvUrl,
  requireEnv,
  readEnv,
};
