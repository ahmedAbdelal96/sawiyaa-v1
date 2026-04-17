import "react-native-gesture-handler";

import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic";
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_900Black } from "@expo-google-fonts/tajawal";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { AppBootstrap } from "@/bootstrap/app-bootstrap";
import { AppNavigationGate } from "@/navigation/app-navigation-gate";
import { AppProviders } from "@/providers/app-providers";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tajawal_500Medium,
    Tajawal_400Regular,
    Tajawal_700Bold,
    Tajawal_900Black,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProviders>
      <AppBootstrap>
        <AppNavigationGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AppNavigationGate>
      </AppBootstrap>
    </AppProviders>
  );
}
