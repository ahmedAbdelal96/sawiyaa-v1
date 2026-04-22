import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

export default function PatientForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <View
        style={[styles.radialTop, { backgroundColor: theme.colors.accent }]}
      />

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/signin/patient")}
        style={styles.backWrap}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={18} color={theme.colors.textMuted} />
        <Text color={theme.colors.textMuted} style={styles.backText}>
          {t("auth.common.backToPatientSignIn")}
        </Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View
          style={[styles.logoCircle, { backgroundColor: theme.colors.surface }]}
        >
          <Ionicons name="key" size={28} color={theme.colors.primary} />
        </View>

        <Text
          style={styles.title}
          color={theme.colors.textPrimary}
          weight="bold"
        >
          {t("auth.patientForgotPassword.title")}
        </Text>
        <Text style={styles.subtitle} color={theme.colors.textSecondary}>
          {t("auth.patientForgotPassword.subtitle")}
        </Text>

        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
            },
          ]}
        >
          <Text style={styles.noticeText} color={theme.colors.textSecondary}>
            {t("auth.patientForgotPassword.contractBlocked")}
          </Text>
        </View>

        <Button
          title={t("auth.patientForgotPassword.backToSignIn")}
          onPress={() => router.replace("/(auth)/signin/patient")}
          style={styles.primaryButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  radialTop: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -180,
    left: -120,
    opacity: 0.5,
  },
  backWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 13,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 15,
    width: "100%",
  },
});
