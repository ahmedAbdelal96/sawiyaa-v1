import React from "react";
import { I18nManager, Linking, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Card, Header, Screen, Text } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default function PractitionerAvailabilityScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isArabic = i18n.language?.startsWith("ar");
  const rowDirection = I18nManager.isRTL ? "row-reverse" : "row";
  const webBaseUrl = normalizeBaseUrl(
    process.env.EXPO_PUBLIC_WEB_APP_URL ?? "http://localhost:3000",
  );
  const webAvailabilityUrl = `${webBaseUrl}/${isArabic ? "ar" : "en"}/practitioner/availability`;

  return (
    <Screen bg="background">
      <Header title={t("practitioner.availability.title")} />

      <View style={styles.content}>
        <Card variant="outlined" padding="lg" style={styles.card}>
          <View style={[styles.headerRow, { flexDirection: rowDirection }]}>
            <View style={styles.headerCopy}>
              <Text weight="700" style={styles.title} color={theme.colors.textPrimary}>
                {t("practitioner.availability.webManagedTitle")}
              </Text>
              <Text style={styles.body} color={theme.colors.textSecondary}>
                {t("practitioner.availability.webManagedBody")}
              </Text>
            </View>
          </View>

          <View style={styles.noteBlock}>
            <Text weight="600" color={theme.colors.textPrimary}>
              {t("practitioner.availability.overviewTitle")}
            </Text>
            <Text style={styles.noteText} color={theme.colors.textSecondary}>
              {t("practitioner.availability.webManagedSafetyNote")}
            </Text>
            <Text style={styles.noteText} color={theme.colors.textSecondary}>
              {t("practitioner.availability.webManagedSecondary")}
            </Text>
          </View>

          <Button
            title={t("practitioner.availability.openWebDashboard")}
            onPress={() => void Linking.openURL(webAvailabilityUrl)}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    gap: 20,
  },
  headerRow: {
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
  },
  noteBlock: {
    gap: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
