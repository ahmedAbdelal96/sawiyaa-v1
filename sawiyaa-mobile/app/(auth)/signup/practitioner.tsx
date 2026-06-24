import React, { useMemo } from "react";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "../../../src/components/auth/AuthScaffold";
import { Button, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { getAppDirection, isCurrentLanguageRtl } from "../../../src/i18n/direction";

function resolvePractitionerWebRegistrationUrl(language: string): string {
  const locale = language.toLowerCase().startsWith("ar") ? "ar" : "en";
  const configuredBase = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  const webBase = configuredBase && configuredBase.length > 0 ? configuredBase : "http://localhost:3000";
  const normalizedBase = webBase.endsWith("/") ? webBase.slice(0, -1) : webBase;
  return `${normalizedBase}/${locale}/signup/practitioner`;
}

export default function PractitionerSignUpScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();

  const language = i18n.language ?? "ar";
  const isRtl = isCurrentLanguageRtl(language);
  const direction = getAppDirection(language);

  const webRegistrationUrl = useMemo(
    () => resolvePractitionerWebRegistrationUrl(language),
    [language],
  );

  async function openWebRegistration() {
    await Linking.openURL(webRegistrationUrl);
  }

  return (
    <AuthScaffold
      eyebrow={t("auth.practitionerWebOnly.eyebrow")}
      title={t("auth.practitionerWebOnly.title")}
      subtitle={t("auth.practitionerWebOnly.subtitle")}
      footer={
        <TouchableOpacity onPress={() => router.replace("/(auth)/signin/practitioner")}>
          <Text color={theme.colors.textMuted} style={styles.footerText}>
            {t("auth.common.backToPractitionerSignIn")}
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.contentWrap}>
        <Text
          style={[
            styles.secondaryBody,
            { textAlign: isRtl ? "right" : "left", writingDirection: direction },
          ]}
          color={theme.colors.textSecondary}
        >
          {t("auth.practitionerWebOnly.secondaryBody")}
        </Text>

        <Button
          title={t("auth.practitionerWebOnly.primaryCta")}
          onPress={() => void openWebRegistration()}
          style={styles.primaryButton}
        />

        <Button
          title={t("auth.practitionerWebOnly.secondaryCta")}
          variant="secondary"
          onPress={() => router.replace("/(auth)/signin/practitioner")}
          style={styles.secondaryButton}
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    gap: 12,
  },
  secondaryBody: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
  },
});
