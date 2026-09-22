import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  PreferenceToggleRow,
  Screen,
  Text,
} from "../../../../components/ui";
import { useAppDirection } from "../../../../i18n/direction";
import { useTheme } from "../../../../providers/ThemeProvider";
import {
  useMySettingsNotificationPreferences,
  usePutMySettingsNotificationPreferences,
} from "../../../../features/settings/hooks";
import type {
  SettingsNotificationPreferenceItem,
} from "../../../../features/settings/types";
import {
  groupPractitionerNotificationPreferences,
  type PractitionerNotificationCategory,
} from "../preferences";

const CATEGORY_KEYS: readonly PractitionerNotificationCategory[] = [
  "sessions",
  "bookings",
  "messages",
  "schedule",
];

export default function PractitionerNotificationSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRtl, rowDirection } = useAppDirection();
  const preferencesQuery = useMySettingsNotificationPreferences();
  const putPreferences = usePutMySettingsNotificationPreferences();
  const [draft, setDraft] = React.useState<SettingsNotificationPreferenceItem[]>([]);

  React.useEffect(() => {
    const items = preferencesQuery.data?.item.items;
    if (items) {
      setDraft(items);
    }
  }, [preferencesQuery.data?.item.items]);

  const grouped = React.useMemo(
    () => groupPractitionerNotificationPreferences(draft),
    [draft],
  );
  const hasEditablePreferences = CATEGORY_KEYS.some((category) =>
    grouped.has(category),
  );

  const updatePreference = (
    preference: SettingsNotificationPreferenceItem,
    enabled: boolean,
  ) => {
    setDraft((current) =>
      current.map((item) =>
        item.typeSlug === preference.typeSlug &&
        item.channel === preference.channel
          ? { ...item, enabled }
          : item,
      ),
    );
  };

  const save = async () => {
    try {
      await putPreferences.mutateAsync({ items: draft });
      Alert.alert(
        t("practitionerNotificationSettings.savedTitle"),
        t("practitionerNotificationSettings.savedBody"),
      );
    } catch {
      Alert.alert(
        t("practitionerNotificationSettings.saveFailedTitle"),
        t("practitionerNotificationSettings.saveFailedBody"),
      );
    }
  };

  const retry = () => {
    void preferencesQuery.refetch();
  };

  return (
    <Screen bg="background" testID="practitioner-notification-settings-screen">
      <Header
        title={t("practitionerNotificationSettings.title")}
        showBack
        onBack={() => router.back()}
      />

      {preferencesQuery.isLoading && !preferencesQuery.data ? (
        <LoadingState />
      ) : preferencesQuery.isError && !preferencesQuery.data ? (
        <ErrorState
          title={t("practitionerNotificationSettings.errorTitle")}
          message={t("practitionerNotificationSettings.errorBody")}
          onRetry={retry}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.intro, { borderBottomColor: theme.colors.borderLight }]}>
            <View style={[styles.introRow, { flexDirection: rowDirection }]}>
              <View
                style={[
                  styles.introIcon,
                  {
                    backgroundColor: theme.colors.primaryLight,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons name="options-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={[styles.introCopy, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
                <Text
                  weight="700"
                  style={[styles.introTitle, { textAlign: isRtl ? "right" : "left" }]}
                >
                  {t("practitionerNotificationSettings.introTitle")}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={[styles.introBody, { textAlign: isRtl ? "right" : "left" }]}
                >
                  {t("practitionerNotificationSettings.introBody")}
                </Text>
              </View>
            </View>
          </View>

          {!hasEditablePreferences ? (
            <EmptyState
              title={t("practitionerNotificationSettings.emptyTitle")}
              description={t("practitionerNotificationSettings.emptyBody")}
              icon={<Ionicons name="options-outline" size={44} color={theme.colors.textMuted} />}
            />
          ) : (
            <>
              {CATEGORY_KEYS.map((category) => {
                const items = grouped.get(category);
                if (!items?.length) return null;

                return (
                  <Card
                    key={category}
                    variant="outlined"
                    padding="sm"
                    style={[
                      styles.categoryCard,
                      {
                        borderColor: theme.colors.borderLight,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      weight="700"
                      style={[styles.categoryTitle, { textAlign: isRtl ? "right" : "left" }]}
                    >
                      {t("practitionerNotificationSettings.categories." + category + ".title")}
                    </Text>
                    <Text
                      color={theme.colors.textSecondary}
                      style={[styles.categorySubtitle, { textAlign: isRtl ? "right" : "left" }]}
                    >
                      {t("practitionerNotificationSettings.categories." + category + ".subtitle")}
                    </Text>

                    <View style={[styles.events, { borderTopColor: theme.colors.borderLight }]}>
                      {items.map((event) => (
                        <View key={event.typeSlug} style={styles.event}>
                          <Text
                            weight="600"
                            color={theme.colors.textPrimary}
                            style={[styles.eventTitle, { textAlign: isRtl ? "right" : "left" }]}
                          >
                            {t(
                              "practitionerNotificationSettings.events." +
                                event.definition.titleKey,
                            )}
                          </Text>
                          {event.definition.titleKey === "scheduleReminder" ? (
                            <Text
                              color={theme.colors.textMuted}
                              style={[styles.eventHint, { textAlign: isRtl ? "right" : "left" }]}
                            >
                              {t("practitionerNotificationSettings.eventHint")}
                            </Text>
                          ) : null}
                          <View style={styles.channels}>
                            {event.channels.map((channel) => (
                              <PreferenceToggleRow
                                key={channel.channel}
                                title={t(
                                  "practitionerNotificationSettings.channels." +
                                    channel.channel,
                                )}
                                value={channel.enabled}
                                onValueChange={(enabled) =>
                                  updatePreference(channel, enabled)
                                }
                                disabled={putPreferences.isPending}
                                style={styles.channelRow}
                              />
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </Card>
                );
              })}

              <Button
                title={
                  putPreferences.isPending
                    ? t("practitionerNotificationSettings.saving")
                    : t("practitionerNotificationSettings.save")
                }
                onPress={() => void save()}
                disabled={putPreferences.isPending}
                style={styles.saveButton}
              />
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  intro: {
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  introRow: {
    alignItems: "center",
    gap: 12,
  },
  introIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  introCopy: {
    flex: 1,
    gap: 3,
  },
  introTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  introBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  categoryCard: {
    borderRadius: 16,
  },
  categoryTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  categorySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  events: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  event: {
    paddingVertical: 6,
  },
  channels: {
    marginTop: 2,
  },
  eventTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  eventHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },
  channelRow: {
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  saveButton: {
    marginTop: 2,
  },
});
