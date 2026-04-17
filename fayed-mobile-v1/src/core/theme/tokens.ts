export const colors = {
  primary: "#0B5CAC",
  primaryPressed: "#084B8D",
  primaryContainer: "#3575C7",
  primaryFixed: "#D5E3FF",
  secondary: "#43664D",
  secondaryFixed: "#C5ECCC",
  tertiaryFixed: "#D6E3FF",
  background: "#F8F9FB",
  surface: "#F8F9FB",
  surfaceLowest: "#FFFFFF",
  surfaceLow: "#F2F4F6",
  surfaceHigh: "#E6E8EA",
  surfaceMuted: "#F2F4F6",
  text: "#1F2A3D",
  textSecondary: "#424751",
  textMuted: "#727783",
  border: "rgba(194,198,211,0.2)",
  success: "#2D6F46",
  danger: "#BA1A1A",
  warning: "#9A6D1E",
  overlay: "rgba(19, 28, 41, 0.08)",
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
} as const;

export const radii = {
  sm: 12,
  md: 24,
  lg: 32,
  xl: 48,
  pill: 999,
} as const;

export const typography = {
  display: 40,
  heading: 30,
  title: 22,
  body: 16,
  bodySmall: 14,
  caption: 12,
} as const;

export const shadows = {
  card: {
    shadowColor: "#1F2A3D",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 3,
  },
} as const;
