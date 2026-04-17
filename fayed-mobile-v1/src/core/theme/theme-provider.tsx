import type { PropsWithChildren} from "react";
import { createContext, useContext } from "react";

import { theme, type AppTheme } from "@/core/theme/theme";

const ThemeContext = createContext<AppTheme>(theme);

export function ThemeProvider({ children }: PropsWithChildren) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

