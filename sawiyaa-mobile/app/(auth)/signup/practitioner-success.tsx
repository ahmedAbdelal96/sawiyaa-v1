import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

export default function PractitionerSignupSuccessScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="checkmark" size={34} color={theme.colors.primary} />
        </View>
        <Text weight="bold" style={styles.title}>{t("auth.practitionerSignUp.successTitle")}</Text>
        <Text color={theme.colors.textSecondary} style={styles.body}>{t("auth.practitionerSignUp.pendingSuccess")}</Text>
        <Button title={t("auth.practitionerSignUp.goToSignInNow")} onPress={() => router.replace("/(auth)/signin/practitioner")} style={styles.button} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 24 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  title: { fontSize: 24, textAlign: "center", marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 25, textAlign: "center", marginBottom: 28 },
  button: { width: "100%" },
});
