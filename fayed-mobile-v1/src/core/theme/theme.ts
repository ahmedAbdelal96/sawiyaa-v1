import { colors, radii, shadows, spacing, typography } from "@/core/theme/tokens";

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
} as const;

export type AppTheme = typeof theme;

