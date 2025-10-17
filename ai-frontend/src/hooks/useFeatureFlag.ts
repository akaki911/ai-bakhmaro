import { useEffect, useState } from 'react';
import {
  FeatureFlagName,
  getFeatureFlag,
  getFeatureFlagStorageKey,
  subscribeToFeatureFlag,
} from '@/lib/featureFlags';

export const useFeatureFlag = (flag: FeatureFlagName): boolean => {
  const [value, setValue] = useState<boolean>(() => getFeatureFlag(flag));

  useEffect(() => {
    let isMounted = true;

    const updateValue = () => {
      if (isMounted) {
        setValue(getFeatureFlag(flag));
      }
    };

    updateValue();

    const unsubscribe = subscribeToFeatureFlag(flag, updateValue);

    let storageHandler: ((event: StorageEvent) => void) | undefined;

    if (typeof window !== 'undefined') {
      storageHandler = (event: StorageEvent) => {
        if (event.key === getFeatureFlagStorageKey(flag)) {
          updateValue();
        }
      };

      window.addEventListener('storage', storageHandler);
    }

    return () => {
      isMounted = false;
      unsubscribe();

      if (storageHandler && typeof window !== 'undefined') {
        window.removeEventListener('storage', storageHandler);
      }
    };
  }, [flag]);

  return value;
};

export default useFeatureFlag;
