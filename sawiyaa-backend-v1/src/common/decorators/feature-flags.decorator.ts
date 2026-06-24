import { SetMetadata } from '@nestjs/common';
import { FEATURE_FLAGS_KEY } from '../constants/auth-metadata.constants';

/**
 * Declares feature flags that must be enabled before a route can run.
 * FeatureFlagGuard is only a baseline right now; Config Module will later back these checks.
 */
export const RequireFeatureFlags = (...flags: string[]) =>
  SetMetadata(FEATURE_FLAGS_KEY, flags);
