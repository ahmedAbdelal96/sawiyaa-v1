import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../src/providers/ThemeProvider";
import { AuthProvider } from "../src/providers/AuthProvider";
import { AuthGatewayProvider } from "../src/providers/AuthGatewayProvider";
import { NavigationHistoryProvider } from "../src/providers/NavigationHistoryProvider";
import { ViewerTimeZoneProvider } from "../src/providers/ViewerTimeZoneProvider";
import { RuntimeErrorBoundary } from "../src/components/RuntimeErrorBoundary";
import { useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import "../src/i18n";
import { NotificationRealtimeBridge } from "../src/features/notifications/NotificationRealtimeBridge";

// Inject global web styles to remove Chrome/Safari autofill blue tint and outline
if (Platform.OS === "web" && typeof document !== "undefined") {
  const styleId = "sawiyaa-web-autofill-fix";
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.innerHTML = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
        -webkit-text-fill-color: #053F38 !important;
        transition: background-color 5000s ease-in-out 0s;
      }
      input {
        background-color: transparent !important;
        outline: none !important;
      }
    `;
    document.head.appendChild(styleElement);
  }
}

// Prevent the native splash screen from auto-hiding until bootstrap is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

export default function RootLayout() {
  const router = useRouter();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationRealtimeBridge />
            <ViewerTimeZoneProvider>
              <AuthGatewayProvider>
                <NavigationHistoryProvider>
                  <RuntimeErrorBoundary
                    onBack={() => {
                      if (typeof router.canGoBack === "function" && router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace("/");
                      }
                    }}
                  >
                    <Slot />
                  </RuntimeErrorBoundary>
                </NavigationHistoryProvider>
              </AuthGatewayProvider>
            </ViewerTimeZoneProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
