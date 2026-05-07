import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Header,
  Screen,
  Card,
  Text,
  Button,
  ListRow,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
  usePutMySettingsNotificationPreferences,
} from "../../src/features/settings/hooks";
import { formatNotificationType } from "../../src/features/patient/profile/account-utils";
import { extractApiErrorMessage } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";

export default function PatientProfileNotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const settingsQuery = useMySettings();
  const notificationPreferencesQuery = useMySettingsNotificationPreferences();
  const putNotificationPreferences = usePutMySettingsNotificationPreferences();

  const settings = settingsQuery.data?.item;
  const notificationPreferences =
    notificationPreferencesQuery.data?.item ??
    settings?.notificationPreferences;

  const [draft, setDraft] = useState<
    Array<{ typeSlug: string; channel: "IN_APP" | "EMAIL"; enabled: boolean }>
  >([]);

  useEffect(() => {
    if (!notificationPreferences) {
      return;
    }

    setDraft(
      notificationPreferences.items.map((item) => ({
        typeSlug: item.typeSlug,
        channel: item.channel,
        enabled: item.enabled,
      })),
    );
  }, [notificationPreferences]);

  const supportedChannelsText = useMemo(() => {
    if (!notificationPreferences?.supportedChannels?.length) {
      return null;
    }

    return notificationPreferences.supportedChannels.join(" • ");
  }, [notificationPreferences?.supportedChannels]);

  const save = async () => {
    try {
      await putNotificationPreferences.mutateAsync({ items: draft });
      Alert.alert(
        t("profileScreen.notifications.savedTitle"),
        t("profileScreen.notifications.savedBody"),
      );
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.notifications.saveFailedBody"),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header title={t("profileScreen.notifications.screenTitle")} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
          padding="none"
        >
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.notifications.centerTitle")}
              subtitle={t("profileScreen.notifications.centerBody")}
              leftElement={
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push("/(patient)/notifications" as any)}
              showChevron
            />
          </View>
        </Card>

        {!notificationPreferences || draft.length === 0 ? (
          <Card
            variant="elevated"
            style={[
              styles.card,
              { borderWidth: 1, borderColor: theme.colors.borderLight },
            ]}
          >
            <Text weight="bold" style={styles.cardTitle}>
              {t("profileScreen.notifications.unavailableTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.bodyText}>
              {t("profileScreen.notifications.unavailableBody")}
            </Text>
            {supportedChannelsText ? (
              <Text color={theme.colors.textSecondary} style={styles.metaText}>
                {t("profileScreen.notifications.supportedChannels", {
                  channels: supportedChannelsText,
                })}
              </Text>
            ) : null}
          </Card>
        ) : (
          <>
            <Card
              variant="elevated"
              style={[
                styles.card,
                { borderWidth: 1, borderColor: theme.colors.borderLight },
              ]}
            >
              <Text weight="bold" style={styles.cardTitle}>
                {t("profileScreen.notifications.preferencesTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.bodyText}>
                {t("profileScreen.notifications.preferencesBody")}
              </Text>
              {supportedChannelsText ? (
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.metaText}
                >
                  {t("profileScreen.notifications.supportedChannels", {
                    channels: supportedChannelsText,
                  })}
                </Text>
              ) : null}
              <View style={styles.listWrap}>
                {draft.map((item, index) => (
                  <View
                    key={`${item.typeSlug}-${item.channel}`}
                    style={styles.preferenceRow}
                  >
                    <View style={styles.preferenceTextWrap}>
                      <Text weight="500">
                        {formatNotificationType(item.typeSlug)}
                      </Text>
                      <Text
                        color={theme.colors.textSecondary}
                        style={styles.preferenceMeta}
                      >
                        {t(
                          `profileScreen.notifications.channels.${item.channel}`,
                        )}
                      </Text>
                    </View>
                    <Switch
                      value={item.enabled}
                      onValueChange={(enabled) =>
                        setDraft((current) =>
                          current.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? { ...currentItem, enabled }
                              : currentItem,
                          ),
                        )
                      }
                    />
                  </View>
                ))}
              </View>
            </Card>

            <Button
              title={
                putNotificationPreferences.isPending
                  ? t("profileScreen.common.saving")
                  : t("profileScreen.common.save")
              }
              onPress={save}
              disabled={putNotificationPreferences.isPending}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    gap: 10,
  },
  rowPad: {
    paddingHorizontal: 16,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  listWrap: {
    marginTop: 10,
    gap: 12,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  preferenceTextWrap: {
    flex: 1,
  },
  preferenceMeta: {
    fontSize: 12,
    marginTop: 3,
  },
});
