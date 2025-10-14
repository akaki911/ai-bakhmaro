export const resolveFeatureFlag = (rawValue: unknown, defaultValue = false): boolean => {
  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();

    if (['1', 'true', 'on', 'yes', 'enabled'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'off', 'no', 'disabled'].includes(normalized)) {
      return false;
    }

    if (normalized.length === 0) {
      return defaultValue;
    }
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue !== 0;
  }

  return defaultValue;
};

export const envFeatureFlag = (flagName: string, defaultValue = false): boolean => {
  try {
    const envSource = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
    const rawValue = envSource?.[flagName];
    return resolveFeatureFlag(rawValue, defaultValue);
  } catch (error) {
    if (typeof process !== 'undefined' && process.env) {
      return resolveFeatureFlag(process.env[flagName], defaultValue);
    }

    return defaultValue;
  }
};

export const FEATURE_FLAGS = {
  GITHUB: envFeatureFlag('VITE_GITHUB_ENABLED'),
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

type FeatureFlagOverrides = Partial<Record<FeatureFlagName, boolean>>;

const featureFlagStorageKey = (flag: FeatureFlagName): string => `feature-flag:${flag.toLowerCase()}`;

const loadInitialOverrides = (): FeatureFlagOverrides => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }

  try {
    return (Object.keys(FEATURE_FLAGS) as FeatureFlagName[]).reduce<FeatureFlagOverrides>((acc, flag) => {
      const storedValue = window.localStorage.getItem(featureFlagStorageKey(flag));
      if (storedValue === null) {
        return acc;
      }

      return {
        ...acc,
        [flag]: resolveFeatureFlag(storedValue, FEATURE_FLAGS[flag]),
      };
    }, {});
  } catch (error) {
    console.warn('⚠️ Failed to load feature flag overrides from storage:', error);
    return {};
  }
};

let overrides: FeatureFlagOverrides = loadInitialOverrides();

const listeners = new Map<FeatureFlagName, Set<() => void>>();

const notifyListeners = (flag: FeatureFlagName) => {
  const subscribers = listeners.get(flag);
  if (!subscribers) {
    return;
  }

  subscribers.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('❌ Feature flag listener error:', error);
    }
  });
};

const updateOverrideInMemory = (flag: FeatureFlagName, value: boolean | null) => {
  if (value === null) {
    if (Object.prototype.hasOwnProperty.call(overrides, flag)) {
      const updated = { ...overrides };
      delete updated[flag];
      overrides = updated;
    }
    return;
  }

  overrides = {
    ...overrides,
    [flag]: value,
  };
};

export const getFeatureFlag = (flag: FeatureFlagName): boolean => {
  if (Object.prototype.hasOwnProperty.call(overrides, flag)) {
    const overrideValue = overrides[flag];
    if (typeof overrideValue === 'boolean') {
      return overrideValue;
    }
  }

  return FEATURE_FLAGS[flag] ?? false;
};

export const isFeatureEnabled = (flag: FeatureFlagName): boolean => getFeatureFlag(flag);

const persistOverride = (flag: FeatureFlagName, value: boolean | null) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(featureFlagStorageKey(flag));
    } else {
      window.localStorage.setItem(featureFlagStorageKey(flag), value ? 'true' : 'false');
    }
  } catch (error) {
    console.warn('⚠️ Failed to persist feature flag override:', error);
  }
};

export const setFeatureFlagOverride = (flag: FeatureFlagName, value: boolean): void => {
  updateOverrideInMemory(flag, value);
  persistOverride(flag, value);
  notifyListeners(flag);
};

export const clearFeatureFlagOverride = (flag: FeatureFlagName): void => {
  updateOverrideInMemory(flag, null);
  persistOverride(flag, null);
  notifyListeners(flag);
};

export const subscribeToFeatureFlag = (flag: FeatureFlagName, listener: () => void): (() => void) => {
  const subscribers = listeners.get(flag) ?? new Set<() => void>();
  subscribers.add(listener);
  listeners.set(flag, subscribers);

  return () => {
    const current = listeners.get(flag);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(flag);
    }
  };
};

export const getFeatureFlagStorageKey = (flag: FeatureFlagName): string => featureFlagStorageKey(flag);

export const getResolvedFeatureFlags = (): Record<FeatureFlagName, boolean> => {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlagName[]).reduce<Record<FeatureFlagName, boolean>>((acc, flag) => {
    acc[flag] = getFeatureFlag(flag);
    return acc;
  }, {} as Record<FeatureFlagName, boolean>);
};
