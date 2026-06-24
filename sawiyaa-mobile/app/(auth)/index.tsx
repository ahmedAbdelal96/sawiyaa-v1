import React from "react";
import { Image, I18nManager, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { PrimaryButton, SecondaryButton, Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function AuthEntryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;
  const logoAccessibilityLabel = isRTL ? "شعار سويّـة" : "Sawiyaa logo";

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <View style={[styles.blobTop, { backgroundColor: theme.colors.mintAccent }]} />
      <View style={[styles.blobBottom, { backgroundColor: theme.colors.creamAccent }]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel={logoAccessibilityLabel}
          />
          <Text
            variant="title"
            color={theme.colors.textPrimary}
            style={styles.title}
          >
            {t("brand.tagline")}
          </Text>
          <Text
            variant="body"
            color={theme.colors.textSecondary}
            style={styles.subtitle}
          >
            {t("auth.entry.subtitle")}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={t("auth.patientSignUp.submit")}
            onPress={() => router.push("/(auth)/signup/patient")}
            rightIcon={
              <Ionicons
                name={isRTL ? "arrow-back" : "arrow-forward"}
                size={18}
                color={theme.colors.onPrimary}
              />
            }
            style={styles.primaryButton}
          />

          <SecondaryButton
            title={t("auth.patientSignIn.submit")}
            onPress={() => router.push("/(auth)/signin/patient")}
            style={styles.secondaryButton}
          />

          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin/practitioner")}
            activeOpacity={0.8}
            style={styles.practitionerLink}
          >
            <Text
              color={theme.colors.textSecondary}
              style={styles.practitionerLabel}
            >
              {t("auth.entry.practitionerTitle")}
            </Text>
            <Ionicons
              name="medical-outline"
              size={18}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.footerTrust}>
          <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textMuted} />
          <Text variant="caption" color={theme.colors.textMuted} style={styles.footerText}>
            {t("brand.tagline")}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    overflow: "hidden",
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: 18,
    paddingBottom: 24,
  },
  blobTop: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -170,
    left: -120,
    opacity: 0.54,
  },
  blobBottom: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    bottom: -220,
    right: -140,
    opacity: 0.36,
  },
  brandWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  brandLogo: {
    width: 210,
    height: 76,
    marginBottom: 18,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 20,
    paddingVertical: 17,
  },
  secondaryButton: {
    borderRadius: 20,
    paddingVertical: 16,
  },
  practitionerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  practitionerLabel: {
    fontSize: 14,
  },
  footerTrust: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 18,
  },
  footerText: {
    textAlign: "center",
  },
});
