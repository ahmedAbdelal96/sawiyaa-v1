import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../src/providers/ThemeProvider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { AuthGatewayProvider } from "../src/providers/AuthGatewayProvider";
import { NavigationHistoryProvider } from "../src/providers/NavigationHistoryProvider";
import { ViewerTimeZoneProvider } from "../src/providers/ViewerTimeZoneProvider";
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
            <ViewerTimeZoneProvider>
              <AuthGatewayProvider>
                <NavigationHistoryProvider>
                  <Slot />
                </NavigationHistoryProvider>
              </AuthGatewayProvider>
            </ViewerTimeZoneProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
