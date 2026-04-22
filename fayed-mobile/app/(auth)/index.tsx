import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen, Button } from "../../src/components/ui";
import { Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

export default function AuthEntryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <View
        style={[
          styles.radialTop,
          styles.noPointerEvents,
          { backgroundColor: theme.colors.accent },
        ]}
      />
      <View
        style={[
          styles.radialBottom,
          styles.noPointerEvents,
          { backgroundColor: theme.colors.primaryLight },
        ]}
      />

      <View style={styles.centerWrap}>
        <View
          style={[
            styles.logoGlow,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        />
        <View
          style={[styles.logoCircle, { backgroundColor: theme.colors.surface }]}
        >
          <Ionicons name="water" size={38} color={theme.colors.primary} />
        </View>

        <Text
          style={styles.title}
          weight="bold"
          color={theme.colors.textPrimary}
        >
          {t("auth.entry.title")}
        </Text>
        <Text style={styles.subtitle} color={theme.colors.textSecondary}>
          {t("auth.entry.subtitle")}
        </Text>
      </View>

      <View style={styles.bottomWrap}>
        <Button
          title={t("auth.patientSignUp.submit")}
          onPress={() => router.push("/(auth)/signup/patient")}
          style={styles.cta}
        />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signin/patient")}
          activeOpacity={0.85}
        >
          <Text style={styles.link} color={theme.colors.textBrand} weight="600">
            {t("auth.patientSignIn.submit")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signin/practitioner")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryLink} color={theme.colors.textMuted}>
            {t("auth.entry.practitionerTitle")}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  radialTop: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 220,
    top: -240,
    left: -80,
    opacity: 0.46,
  },
  radialBottom: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 220,
    bottom: -280,
    right: -120,
    opacity: 0.38,
  },
  noPointerEvents: {
    pointerEvents: "none",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 188,
    height: 188,
    borderRadius: 94,
    opacity: 0.55,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  title: {
    fontSize: 48,
    lineHeight: 56,
    textAlign: "center",
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  bottomWrap: {
    gap: 16,
    paddingBottom: 8,
  },
  cta: {
    borderRadius: 999,
    paddingVertical: 16,
  },
  link: {
    fontSize: 20,
    textAlign: "center",
  },
  secondaryLink: {
    fontSize: 14,
    textAlign: "center",
  },
});
