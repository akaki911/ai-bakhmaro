export type FeatureFlags = {
  /**
   * Enables access to the Mail demo experience under the /mail route.
   */
  enableMailDemo?: boolean;
};

export const FEATURE_FLAGS: FeatureFlags = {
  enableMailDemo: true,
};
