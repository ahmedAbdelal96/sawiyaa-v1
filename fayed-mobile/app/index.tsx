import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, LoadingState } from "../src/components/ui";
import { useAuth } from "../src/providers/AuthProvider";
import { useTheme } from "../src/providers/ThemeProvider";

export default function SplashScreen() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [minSplashDone, setMinSplashDone] = useState(false);
  const logoAccessibilityLabel = i18n.language?.startsWith("ar")
    ? "شعار سويّـة"
    : "Sawiyaa logo";

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
      <View style={[styles.blobTop, { backgroundColor: theme.colors.mintAccent }]} />
      <View style={[styles.blobBottom, { backgroundColor: theme.colors.creamAccent }]} />
      <View style={[styles.glowCenter, { backgroundColor: theme.colors.primaryLight }]} />

      <View style={styles.content}>
        <View style={styles.brandMarkWrap}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel={logoAccessibilityLabel}
          />
        </View>

        <View style={styles.titleBlock}>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            {t("brand.tagline")}
          </Text>
        </View>

        <View style={styles.loaderWrap}>
          <LoadingState />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 28,
  },
  blobTop: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -150,
    left: -120,
    opacity: 0.72,
  },
  blobBottom: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    bottom: -190,
    right: -150,
    opacity: 0.5,
  },
  glowCenter: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.18,
  },
  brandMarkWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  brandLogo: {
    width: 230,
    height: 82,
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 0.2,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 240,
  },
  loaderWrap: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
