import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Text, LoadingState } from "../src/components/ui";
import { useAuth } from "../src/providers/AuthProvider";
import { useTheme } from "../src/providers/ThemeProvider";

export default function SplashScreen() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { theme } = useTheme();
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !minSplashDone) return;

    if (!user) {
      router.replace("/(auth)");
    } else if (role === "patient") {
      router.replace("/(patient)");
    } else if (role === "practitioner") {
      router.replace("/(practitioner)");
    } else {
      router.replace("/(auth)");
    }
  }, [user, role, isLoading, minSplashDone, router]);

  return (
    <Screen safeArea bg="background" style={styles.container}>
      <View style={styles.content}>
        <Text weight="bold" color={theme.colors.primary} style={styles.logo}>
          fayed
        </Text>
        <LoadingState />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  logo: {
    fontSize: 48,
    marginBottom: 24,
    letterSpacing: 2,
  },
});
