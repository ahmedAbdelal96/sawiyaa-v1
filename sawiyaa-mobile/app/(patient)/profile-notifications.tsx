import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Header,
  PreferenceToggleRow,
  Screen,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
  usePutMySettingsNotificationPreferences,
} from "../../src/features/settings/hooks";
import type {
  SettingsNotificationChannel,
  SettingsNotificationPreferenceItem,
} from "../../src/features/settings/types";
import { useAppDirection } from "../../src/i18n/direction";
import {
  getPatientNotificationEventLabelKey,
  groupPatientNotificationPreferences,
  type PatientNotificationCategory,
} from "../../src/features/patient/notifications/preferences";

const CATEGORY_ORDER: PatientNotificationCategory[] = [
  "sessions",
  "messages",
  "payments",
  "account",
  "general",
];

const CHANNEL_LABEL_KEYS: Record<SettingsNotificationChannel, string> = {
  PUSH: "push",
  IN_APP: "inApp",
  EMAIL: "email",
};

export default function PatientProfileNotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { rowDirection, isRtl } = useAppDirection();
  const settingsQuery = useMySettings();
  const preferencesQuery = useMySettingsNotificationPreferences();
  const putPreferences = usePutMySettingsNotificationPreferences();
  const preferences = preferencesQuery.data?.item ?? settingsQuery.data?.item?.notificationPreferences;
  const [draft, setDraft] = useState<SettingsNotificationPreferenceItem[]>([]);

  useEffect(() => {
    if (preferences) setDraft(preferences.items.map((item) => ({ ...item })));
  }, [preferences]);

  const groups = useMemo(() => groupPatientNotificationPreferences(draft), [draft]);
  const groupedCategories = useMemo(
    () => CATEGORY_ORDER.map((category) => ({ category, groups: groups.filter((group) => group.category === category) })).filter((entry) => entry.groups.length > 0),
    [groups],
  );

  const updateItem = (typeSlug: string, channel: SettingsNotificationChannel, enabled: boolean) => {
    setDraft((current) => current.map((item) => (
      item.typeSlug === typeSlug && item.channel === channel ? { ...item, enabled } : item
    )));
  };

  const save = async () => {
    try {
      await putPreferences.mutateAsync({ items: draft });
      Alert.alert(t("profileScreen.notifications.savedTitle"), t("profileScreen.notifications.savedBody"));
    } catch {
      Alert.alert(t("profileScreen.notifications.saveFailedTitle"), t("profileScreen.notifications.saveFailedBody"));
    }
  };

  const isLoading = settingsQuery.isLoading || preferencesQuery.isLoading;
  const hasError = settingsQuery.isError || preferencesQuery.isError;

  return (
    <Screen bg="background" testID="patient-notification-settings-screen">
      <Header title={t("profileScreen.notifications.screenTitle")} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text color={theme.colors.textSecondary} style={[styles.intro, { textAlign: isRtl ? "right" : "left" }]}>
          {t("profileScreen.notifications.subtitle")}
        </Text>

        {isLoading ? (
          <Text color={theme.colors.textSecondary} style={styles.centerText}>{t("profileScreen.common.loading")}</Text>
        ) : hasError ? (
          <Card variant="elevated" style={styles.card}>
            <Text weight="600" color={theme.colors.textPrimary}>{t("profileScreen.notifications.errorTitle")}</Text>
            <Text color={theme.colors.textSecondary} style={styles.bodyText}>{t("profileScreen.notifications.errorBody")}</Text>
          </Card>
        ) : groupedCategories.length === 0 ? (
          <Card variant="elevated" style={styles.card}>
            <Text weight="600" color={theme.colors.textPrimary}>{t("profileScreen.notifications.emptyTitle")}</Text>
            <Text color={theme.colors.textSecondary} style={styles.bodyText}>{t("profileScreen.notifications.emptyBody")}</Text>
          </Card>
        ) : (
          <>
            {groupedCategories.map(({ category, groups: categoryGroups }) => (
              <View key={category} style={styles.categorySection}>
                <Text weight="700" color={theme.colors.textPrimary} style={[styles.categoryTitle, { textAlign: isRtl ? "right" : "left" }]}>
                  {t(`profileScreen.notifications.categoryLabels.${category}`)}
                </Text>
                <Card variant="elevated" style={styles.card} padding="none">
                  {categoryGroups.map((group, groupIndex) => (
                    <View key={group.typeSlug} style={styles.eventGroup}>
                      <Text weight="600" color={theme.colors.textPrimary} style={[styles.eventTitle, { textAlign: isRtl ? "right" : "left" }]}>
                        {t(`profileScreen.notifications.events.${getPatientNotificationEventLabelKey(group.typeSlug)}`)}
                      </Text>
                      {group.channels.map((item, channelIndex) => (
                        <PreferenceToggleRow
                          key={`${item.typeSlug}-${item.channel}`}
                          title={t(`profileScreen.notifications.channels.${CHANNEL_LABEL_KEYS[item.channel]}`)}
                          value={item.enabled}
                          disabled={putPreferences.isPending}
                          onValueChange={(enabled) => updateItem(item.typeSlug, item.channel, enabled)}
                          style={[styles.toggleRow, channelIndex === group.channels.length - 1 ? styles.lastToggle : null, { flexDirection: rowDirection }]}
                        />
                      ))}
                      {groupIndex < categoryGroups.length - 1 ? <View style={[styles.eventDivider, { backgroundColor: theme.colors.divider }]} /> : null}
                    </View>
                  ))}
                </Card>
              </View>
            ))}
            <Button
              title={putPreferences.isPending ? t("profileScreen.notifications.saving") : t("profileScreen.notifications.save")}
              onPress={save}
              disabled={putPreferences.isPending}
              style={styles.saveButton}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120, gap: 14 },
  intro: { fontSize: 14, lineHeight: 21, paddingHorizontal: 2 },
  centerText: { textAlign: "center", paddingVertical: 24 },
  categorySection: { gap: 8 },
  categoryTitle: { fontSize: 15, lineHeight: 20, paddingHorizontal: 2 },
  card: { borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DED0", overflow: "hidden" },
  bodyText: { fontSize: 13, lineHeight: 20, marginTop: 6 },
  eventGroup: { paddingHorizontal: 16, paddingTop: 14 },
  eventTitle: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  toggleRow: { paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 0 },
  lastToggle: { paddingBottom: 14 },
  eventDivider: { height: 1, marginTop: 2 },
  saveButton: { height: 50, borderRadius: 14, marginTop: 2 },
});
