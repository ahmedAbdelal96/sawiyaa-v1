import React from "react";
import { Image, I18nManager, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { PrimaryButton, SecondaryButton, Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";

export default function AuthEntryScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;
  const logoAccessibilityLabel = isRTL ? "شعار سويّـة" : "Sawiyaa logo";

  const cardBg = isDark ? theme.colors.surfaceRaised : "#FFFFFF";

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* A. Safe-area branded header */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo_transparent.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel={logoAccessibilityLabel}
          />
        </View>

        {/* B. Strong visual focal point */}
        <View style={styles.focalSection}>
          <View style={[styles.glowCircle, { backgroundColor: theme.colors.mintAccent, opacity: 0.8 }]} />
          
          {/* Layered illustration card representing specialist care */}
          <View style={[styles.focalCard, { backgroundColor: cardBg, borderColor: theme.colors.border }]}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="medical" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.doctorInfo}>
                {/* Simulated therapist info */}
                <View style={[styles.textLineLong, { backgroundColor: theme.colors.textPrimary }]} />
                <View style={[styles.textLineShort, { backgroundColor: theme.colors.textSecondary }]} />
              </View>
            </View>

            {/* Platform Trust Info */}
            <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.mintAccent }]}>
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
              <Text style={styles.verifiedText} color={theme.colors.primary}>
                {isRTL ? "مختص موثق" : "Verified specialist"}
              </Text>
            </View>
          </View>
        </View>

        {/* C. Short emotional product message */}
        <View style={styles.messageSection}>
          <Text
            variant="h1"
            color={theme.colors.textPrimary}
            style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}
          >
            {isRTL ? "رعاية أقرب ليك" : "Care that's closer to you"}
          </Text>
          <Text
            variant="body"
            color={theme.colors.textSecondary}
            style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}
          >
            {isRTL ? "خصوصيتك وأمان بياناتك أولوية" : "Your privacy and data security matter"}
          </Text>
        </View>

        {/* D. Action Buttons */}
        <View style={styles.actions}>
          {/* Primary Patient Registration Action */}
          <PrimaryButton
            title={isRTL ? "إنشاء حساب مريض" : "Create Patient Account"}
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

          {/* Secondary Patient Sign-In Action */}
          <SecondaryButton
            title={t("auth.patientSignIn.submit", "Sign In as Patient")}
            onPress={() => router.push("/(auth)/signin/patient")}
            style={styles.secondaryButton}
          />

          {/* E. Quiet Practitioner Access */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin/practitioner")}
            activeOpacity={0.8}
            style={styles.practitionerLink}
            accessibilityRole="button"
            accessibilityLabel={t("auth.entry.practitionerTitle", "Practitioner Access")}
          >
            <Ionicons
              name="medical-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
            <Text
              color={theme.colors.textSecondary}
              style={styles.practitionerLabel}
            >
              {t("auth.entry.practitionerTitle", "Practitioner Access")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  brandLogo: {
    width: 140,
    height: 48,
  },
  focalSection: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 12,
  },
  glowCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  focalCard: {
    width: 220,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorInfo: {
    flex: 1,
    gap: 6,
  },
  textLineLong: {
    height: 6,
    borderRadius: 3,
    width: "70%",
  },
  textLineShort: {
    height: 6,
    borderRadius: 3,
    width: "40%",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
  },
  messageSection: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    width: "100%",
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
  },
  practitionerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 6,
    minHeight: 48,
  },
  practitionerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
