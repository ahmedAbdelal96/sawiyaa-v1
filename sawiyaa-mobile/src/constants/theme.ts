const typography = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: "700" as const },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "500" as const },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "400" as const },
  bodySmall: { fontSize: 13, lineHeight: 19, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "400" as const },
  button: { fontSize: 15, lineHeight: 20, fontWeight: "700" as const },
  tabLabel: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
} as const;

const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  page: 20,
  gutter: 12,
} as const;

const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 9999,
} as const;

const shadows = {
  none: {
    shadowColor: "rgba(0,0,0,0)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "rgba(23, 29, 29, 1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  md: {
    shadowColor: "rgba(23, 29, 29, 1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: "rgba(23, 29, 29, 1)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

const layers = {
  base: 0,
  raised: 10,
  header: 20,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

const touchTargets = {
  sm: 40,
  md: 44,
  lg: 48,
  min: 44,
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceDim: string;
  surfaceBright: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryLight: string;
  primaryLightHover: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  borderStrong: string;
  divider: string;
  focus: string;
  disabled: string;
  overlay: string;
  shadow: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  mintAccent: string;
  creamAccent: string;
  blueAccent: string;
  amberAccent: string;
  iconContainer: string;
  iconContainerMuted: string;
  iconContainerSuccess: string;
  iconContainerWarning: string;
  iconContainerError: string;
  iconContainerInfo: string;
  statusSuccessBg: string;
  statusSuccessText: string;
  statusWarningBg: string;
  statusWarningText: string;
  statusErrorBg: string;
  statusErrorText: string;
  statusInfoBg: string;
  statusInfoText: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  surfaceTint: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondary: string;
  onSecondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  onTertiary: string;
  onTertiaryContainer: string;
  backgroundSurface: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  errorContainer: string;
  onError: string;
  onErrorContainer: string;
  primaryFixed: string;
  primaryFixedDim: string;
  onPrimaryFixed: string;
  onPrimaryFixedVariant: string;
  secondaryFixed: string;
  secondaryFixedDim: string;
  onSecondaryFixed: string;
  onSecondaryFixedVariant: string;
  tertiaryFixed: string;
  tertiaryFixedDim: string;
  onTertiaryFixed: string;
  onTertiaryFixedVariant: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  textBrand: string;
  ringFocus: string;
}

export type ThemeShape = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  layers: typeof layers;
  touchTargets: typeof touchTargets;
  typography: typeof typography;
};

const lightColors = {
  background: "#F7F4EE",
  surface: "#FCFAF6",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#EEF4EF",
  primary: "#24564F",
  primaryPressed: "#1F4A45",
  primarySoft: "#D9E4DB",
  textPrimary: "#1F332F",
  textSecondary: "#6F7E78",
  textMuted: "#7E8E88",
  border: "#E8DED0",
  divider: "#E8DED0",
  focus: "#24564F",
  disabled: "#AAB6B1",
  overlay: "rgba(31, 51, 47, 0.42)",
  success: "#4D7C5E",
  warning: "#A58245",
  error: "#B14B44",
  info: "#4E7871",
  mintAccent: "#EEF4EF",
  creamAccent: "#FCFAF6",
  blueAccent: "#EEF4EF",
  amberAccent: "#F2E4C9",
  iconContainer: "#EEF4EF",
  iconContainerMuted: "#F2EFE7",
  iconContainerSuccess: "#E8F1EA",
  iconContainerWarning: "#F5EBDD",
  iconContainerError: "#F8E8E6",
  iconContainerInfo: "#E7F0ED",
  statusSuccessBg: "#E8F1EA",
  statusSuccessText: "#3E6E51",
  statusWarningBg: "#F5EBDD",
  statusWarningText: "#896434",
  statusErrorBg: "#F8E8E6",
  statusErrorText: "#9D453F",
  statusInfoBg: "#E7F0ED",
  statusInfoText: "#3F6E67",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#FCFAF6",
  surfaceContainer: "#EEF4EF",
  surfaceContainerHigh: "#E8E0D2",
  surfaceContainerHighest: "#DDD4C2",
  onSurface: "#1F332F",
  onSurfaceVariant: "#6F7E78",
  outline: "#7F8E88",
  outlineVariant: "#E6D6B8",
  surfaceTint: "#24564F",
  primaryContainer: "#24564F",
  onPrimary: "#FFFFFF",
  onPrimaryContainer: "#FFFFFF",
  secondary: "#A7BFAE",
  secondaryContainer: "#EEF4EF",
  onSecondary: "#1F332F",
  onSecondaryContainer: "#1F332F",
  tertiary: "#C8A979",
  tertiaryContainer: "#FCFAF6",
  onTertiary: "#1F332F",
  onTertiaryContainer: "#1F332F",
  backgroundSurface: "#F7F4EE",
  inverseSurface: "#1F332F",
  inverseOnSurface: "#F7F4EE",
  inversePrimary: "#A7BFAE",
  errorContainer: "#F8E8E6",
  onError: "#FFFFFF",
  onErrorContainer: "#7F302B",
  primaryFixed: "#24564F",
  primaryFixedDim: "#A7BFAE",
  onPrimaryFixed: "#FFFFFF",
  onPrimaryFixedVariant: "#24564F",
  secondaryFixed: "#EEF4EF",
  secondaryFixedDim: "#D9E4DB",
  onSecondaryFixed: "#1F332F",
  onSecondaryFixedVariant: "#4D635D",
  tertiaryFixed: "#FCFAF6",
  tertiaryFixedDim: "#E6D6B8",
  onTertiaryFixed: "#1F332F",
  onTertiaryFixedVariant: "#6A5C41",
} as const;

const darkColors = {
  background: "#101716",
  surface: "#131b1a",
  surfaceRaised: "#182221",
  surfaceMuted: "#1a2625",
  primary: "#6de0d8",
  primaryPressed: "#4fcac1",
  primarySoft: "#153534",
  textPrimary: "#f2f7f6",
  textSecondary: "#c8d4d2",
  textMuted: "#95a5a3",
  border: "rgba(156, 180, 177, 0.16)",
  divider: "rgba(156, 180, 177, 0.12)",
  focus: "#6de0d8",
  disabled: "#6e7d7b",
  overlay: "rgba(0, 0, 0, 0.45)",
  success: "#74d59a",
  warning: "#f1bc58",
  error: "#ff8a84",
  info: "#76b7ff",
  mintAccent: "#183332",
  creamAccent: "#2d2620",
  blueAccent: "#162a36",
  amberAccent: "#332612",
  iconContainer: "#153534",
  iconContainerMuted: "#1a2625",
  iconContainerSuccess: "#173625",
  iconContainerWarning: "#302513",
  iconContainerError: "#331818",
  iconContainerInfo: "#16293a",
  statusSuccessBg: "rgba(116, 213, 154, 0.14)",
  statusSuccessText: "#90e0b0",
  statusWarningBg: "rgba(241, 188, 88, 0.14)",
  statusWarningText: "#f7cf80",
  statusErrorBg: "rgba(255, 138, 132, 0.14)",
  statusErrorText: "#ffb2ae",
  statusInfoBg: "rgba(118, 183, 255, 0.14)",
  statusInfoText: "#a7d0ff",
  surfaceContainerLowest: "#111817",
  surfaceContainerLow: "#15201f",
  surfaceContainer: "#182322",
  surfaceContainerHigh: "#1b2726",
  surfaceContainerHighest: "#202d2c",
  onSurface: "#f2f7f6",
  onSurfaceVariant: "#c8d4d2",
  outline: "#7f8f8d",
  outlineVariant: "#38514f",
  surfaceTint: "#6de0d8",
  primaryContainer: "#225e5a",
  onPrimary: "#09201f",
  onPrimaryContainer: "#d6fffb",
  secondary: "#93a6a4",
  secondaryContainer: "#273534",
  onSecondary: "#f7fbfa",
  onSecondaryContainer: "#dde6e5",
  tertiary: "#9aa3a2",
  tertiaryContainer: "#2d3332",
  onTertiary: "#f7fbfa",
  onTertiaryContainer: "#ebefee",
  backgroundSurface: "#101716",
  inverseSurface: "#edf2f1",
  inverseOnSurface: "#23302f",
  inversePrimary: "#00696b",
  errorContainer: "rgba(255, 138, 132, 0.14)",
  onError: "#1b0908",
  onErrorContainer: "#ffd4d1",
  primaryFixed: "#6de0d8",
  primaryFixedDim: "#4fcac1",
  onPrimaryFixed: "#002020",
  onPrimaryFixedVariant: "#004a49",
  secondaryFixed: "#2a3534",
  secondaryFixedDim: "#1e2a29",
  onSecondaryFixed: "#eef3f2",
  onSecondaryFixedVariant: "#d5e0de",
  tertiaryFixed: "#2d3332",
  tertiaryFixedDim: "#232928",
  onTertiaryFixed: "#eef3f2",
  onTertiaryFixedVariant: "#d9e3e2",
} as const;

const sharedColors = {
  surfaceContainerLow: lightColors.surfaceContainerLow,
  surfaceContainerLowest: lightColors.surfaceContainerLowest,
  surfaceContainer: lightColors.surfaceContainer,
  surfaceContainerHigh: lightColors.surfaceContainerHigh,
  surfaceContainerHighest: lightColors.surfaceContainerHighest,
  onSurface: lightColors.onSurface,
  onSurfaceVariant: lightColors.onSurfaceVariant,
  outline: lightColors.outline,
  outlineVariant: lightColors.outlineVariant,
  surfaceTint: lightColors.surfaceTint,
  primaryContainer: lightColors.primaryContainer,
  onPrimary: lightColors.onPrimary,
  onPrimaryContainer: lightColors.onPrimaryContainer,
  secondary: lightColors.secondary,
  secondaryContainer: lightColors.secondaryContainer,
  onSecondary: lightColors.onSecondary,
  onSecondaryContainer: lightColors.onSecondaryContainer,
  tertiary: lightColors.tertiary,
  tertiaryContainer: lightColors.tertiaryContainer,
  onTertiary: lightColors.onTertiary,
  onTertiaryContainer: lightColors.onTertiaryContainer,
  backgroundSurface: lightColors.backgroundSurface,
  inverseSurface: lightColors.inverseSurface,
  inverseOnSurface: lightColors.inverseOnSurface,
  inversePrimary: lightColors.inversePrimary,
  errorContainer: lightColors.errorContainer,
  onError: lightColors.onError,
  onErrorContainer: lightColors.onErrorContainer,
  primaryFixed: lightColors.primaryFixed,
  primaryFixedDim: lightColors.primaryFixedDim,
  onPrimaryFixed: lightColors.onPrimaryFixed,
  onPrimaryFixedVariant: lightColors.onPrimaryFixedVariant,
  secondaryFixed: lightColors.secondaryFixed,
  secondaryFixedDim: lightColors.secondaryFixedDim,
  onSecondaryFixed: lightColors.onSecondaryFixed,
  onSecondaryFixedVariant: lightColors.onSecondaryFixedVariant,
  tertiaryFixed: lightColors.tertiaryFixed,
  tertiaryFixedDim: lightColors.tertiaryFixedDim,
  onTertiaryFixed: lightColors.onTertiaryFixed,
  onTertiaryFixedVariant: lightColors.onTertiaryFixedVariant,
} as const;

export const lightTheme: ThemeShape = {
  colors: {
    ...lightColors,
    // Legacy aliases used by the current app shell and screens.
    surfaceSecondary: lightColors.surfaceRaised,
    surfaceTertiary: lightColors.surfaceMuted,
    primaryLight: lightColors.primarySoft,
    primaryLightHover: "#C7D7CD",
    accent: lightColors.primarySoft,
    textBrand: lightColors.primary,
    borderLight: lightColors.border,
    borderStrong: lightColors.outlineVariant,
    ringFocus: "rgba(36, 86, 79, 0.18)",
    shadow: "rgba(36, 86, 79, 0.12)",
    errorLight: lightColors.statusErrorBg,
    warningLight: lightColors.statusWarningBg,
    successLight: lightColors.statusSuccessBg,
    infoLight: lightColors.statusInfoBg,
    background: lightColors.background,
    surface: lightColors.surface,
    surfaceDim: lightColors.surfaceMuted,
    surfaceBright: lightColors.surfaceRaised,
    ...sharedColors,
  },
  spacing,
  radius,
  shadows,
  layers,
  touchTargets,
  typography,
};

export const darkTheme: ThemeShape = {
  colors: {
    ...darkColors,
    surfaceSecondary: darkColors.surfaceRaised,
    surfaceTertiary: darkColors.surfaceMuted,
    primaryLight: darkColors.primarySoft,
    primaryLightHover: "rgba(167, 191, 174, 0.22)",
    accent: darkColors.primarySoft,
    textBrand: darkColors.primary,
    borderLight: darkColors.border,
    borderStrong: darkColors.outlineVariant,
    ringFocus: "rgba(167, 191, 174, 0.22)",
    shadow: "rgba(0, 0, 0, 0.32)",
    errorLight: darkColors.statusErrorBg,
    warningLight: darkColors.statusWarningBg,
    successLight: darkColors.statusSuccessBg,
    infoLight: darkColors.statusInfoBg,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceDim: darkColors.surfaceMuted,
    surfaceBright: darkColors.surfaceRaised,
    ...sharedColors,
    // Override shared aliases with dark-safe values.
    surfaceContainerLow: darkColors.surfaceContainerLow,
    surfaceContainerLowest: darkColors.surfaceContainerLowest,
    surfaceContainer: darkColors.surfaceContainer,
    surfaceContainerHigh: darkColors.surfaceContainerHigh,
    surfaceContainerHighest: darkColors.surfaceContainerHighest,
    onSurface: darkColors.onSurface,
    onSurfaceVariant: darkColors.onSurfaceVariant,
    outline: darkColors.outline,
    outlineVariant: darkColors.outlineVariant,
    surfaceTint: darkColors.surfaceTint,
    primaryContainer: darkColors.primaryContainer,
    onPrimary: darkColors.onPrimary,
    onPrimaryContainer: darkColors.onPrimaryContainer,
    secondary: darkColors.secondary,
    secondaryContainer: darkColors.secondaryContainer,
    onSecondary: darkColors.onSecondary,
    onSecondaryContainer: darkColors.onSecondaryContainer,
    tertiary: darkColors.tertiary,
    tertiaryContainer: darkColors.tertiaryContainer,
    onTertiary: darkColors.onTertiary,
    onTertiaryContainer: darkColors.onTertiaryContainer,
    backgroundSurface: darkColors.backgroundSurface,
    inverseSurface: darkColors.inverseSurface,
    inverseOnSurface: darkColors.inverseOnSurface,
    inversePrimary: darkColors.inversePrimary,
    errorContainer: darkColors.errorContainer,
    onError: darkColors.onError,
    onErrorContainer: darkColors.onErrorContainer,
    primaryFixed: darkColors.primaryFixed,
    primaryFixedDim: darkColors.primaryFixedDim,
    onPrimaryFixed: darkColors.onPrimaryFixed,
    onPrimaryFixedVariant: darkColors.onPrimaryFixedVariant,
    secondaryFixed: darkColors.secondaryFixed,
    secondaryFixedDim: darkColors.secondaryFixedDim,
    onSecondaryFixed: darkColors.onSecondaryFixed,
    onSecondaryFixedVariant: darkColors.onSecondaryFixedVariant,
    tertiaryFixed: darkColors.tertiaryFixed,
    tertiaryFixedDim: darkColors.tertiaryFixedDim,
    onTertiaryFixed: darkColors.onTertiaryFixed,
    onTertiaryFixedVariant: darkColors.onTertiaryFixedVariant,
  },
  spacing,
  radius,
  shadows,
  layers,
  touchTargets,
  typography,
};
