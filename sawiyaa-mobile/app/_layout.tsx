import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../src/providers/ThemeProvider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { AuthGatewayProvider } from "../src/providers/AuthGatewayProvider";
import { NavigationHistoryProvider } from "../src/providers/NavigationHistoryProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import "../src/i18n";

// Prevent the native splash screen from auto-hiding until bootstrap is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AuthGatewayProvider>
              <NavigationHistoryProvider>
                <Slot />
              </NavigationHistoryProvider>
            </AuthGatewayProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
