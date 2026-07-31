import { useTheme } from "../../../providers/ThemeProvider";

export function usePublicTheme() {
  const { theme, isDark } = useTheme();
  return {
    publicTheme: theme.public,
    isDark,
    theme,
  };
}
export type { PublicThemeTokens } from "../../../constants/theme";
