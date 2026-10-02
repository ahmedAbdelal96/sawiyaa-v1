import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type ThemeShape } from '../constants/theme';
import { DEFAULT_THEME_MODE, resolveThemeMode, type ThemeMode, APP_THEME_STORAGE_KEY } from './theme-constants';

export type { ThemeMode };
export { APP_THEME_STORAGE_KEY };

type ThemeType = ThemeShape;

interface ThemeContextProps {
  theme: ThemeType;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);

  // Load saved theme preference on mount
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(APP_THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (isMounted) setThemeModeState(resolveThemeMode(savedMode));
      })
      .catch(() => {
        // Keep the light default if the stored preference cannot be read.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(APP_THEME_STORAGE_KEY, mode);
    } catch {
      // Keep state change even if local storage write fails
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const nextMode: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(APP_THEME_STORAGE_KEY, nextMode).catch(() => {});
      return nextMode;
    });
  }, []);

  // Determine actual isDark state
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
