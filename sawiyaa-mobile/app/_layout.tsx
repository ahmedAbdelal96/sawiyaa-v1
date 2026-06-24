import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../src/providers/ThemeProvider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { NavigationHistoryProvider } from "../src/providers/NavigationHistoryProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../src/i18n";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NavigationHistoryProvider>
              <Slot />
            </NavigationHistoryProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
