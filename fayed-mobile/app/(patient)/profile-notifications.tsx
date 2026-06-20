import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Header,
  Screen,
  Card,
  Text,
  Button,
  ListRow,
  PreferenceToggleRow,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
  usePutMySettingsNotificationPreferences,
} from "../../src/features/settings/hooks";
import { formatNotificationType } from "../../src/features/patient/profile/account-utils";
import { useAppDirection } from "../../src/i18n/direction";
import { extractApiErrorMessage } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";

function formatNotificationTypeLabel(typeSlug: string) {
  const clean = typeSlug.replace(/[\.-]/g, "_");
  return formatNotificationType(clean);
}

function getNotificationTypeLabel(typeSlug: string, t: any) {
  switch (typeSlug) {
    case "sessions.session-confirmed":
      return t("patientNotifications.feedTypes.sessionConfirmedTitle", {
        defaultValue: "Session Confirmed",
      });
    case "sessions.session-join-available":
      return t("patientNotifications.feedTypes.sessionJoinAvailableTitle", {
        defaultValue: "Session Ready to Join",
      });
    default:
      return formatNotificationTypeLabel(typeSlug);
  }
}

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
    { typeSlug: string; channel: "IN_APP" | "EMAIL"; enabled: boolean }[]
  >([]);

  const { isRtl, rowDirection } = useAppDirection();

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

  // Group notifications dynamically based on prefix
  const categories = useMemo(() => {
    const groups: Record<string, typeof draft> = {};
    draft.forEach((item) => {
      let cat = "general";
      if (item.typeSlug.startsWith("sessions.")) {
        cat = "sessions";
      } else if (item.typeSlug.startsWith("messages.")) {
        cat = "messages";
      }
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [draft]);

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Inbox Link Card */}
        <Card
          variant="elevated"
          style={styles.inboxCard}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.notifications.centerTitle")}
              subtitle={t("profileScreen.notifications.centerBody")}
              leftElement={
                <View style={[styles.iconWrapper, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
              }
              onPress={() => router.push("/(patient)/notifications" as any)}
              showChevron
              style={{ flexDirection: rowDirection }}
            />
          </View>
        </Card>

        {!notificationPreferences || draft.length === 0 ? (
          <Card
            variant="elevated"
            style={styles.card}
            padding="none"
          >
            <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />
            <View style={styles.cardInnerPadding}>
              <Text weight="bold" style={styles.cardTitle} color={theme.colors.textPrimary}>
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
            </View>
          </Card>
        ) : (
          <>
            {Object.keys(categories).map((catKey) => {
              const catItems = categories[catKey];
              if (!catItems || catItems.length === 0) return null;

              let title = "";
              let subtitle = "";
              let iconName: "calendar-outline" | "chatbubbles-outline" | "notifications-outline" = "notifications-outline";
              let iconBgColor = theme.colors.mintAccent;
              let isWarmBackground = false;

              if (catKey === "sessions") {
                title = t("profileScreen.notifications.categories.sessions.title", { defaultValue: "Sessions & Appointments" });
                subtitle = t("profileScreen.notifications.categories.sessions.subtitle", { defaultValue: "Alerts about booking confirmation and join availability" });
                iconName = "calendar-outline";
                iconBgColor = theme.colors.mintAccent;
              } else if (catKey === "messages") {
                title = t("profileScreen.notifications.categories.messages.title", { defaultValue: "Chats & Messages" });
                subtitle = t("profileScreen.notifications.categories.messages.subtitle", { defaultValue: "Alerts when you receive a message from practitioners or support" });
                iconName = "chatbubbles-outline";
                iconBgColor = "#E8F1F8"; // Soft blue/teal
                isWarmBackground = true; // Use Warm Card to vary visual rhythm!
              } else {
                title = t("profileScreen.notifications.categories.general.title", { defaultValue: "General Alerts" });
                subtitle = t("profileScreen.notifications.categories.general.subtitle", { defaultValue: "Other system alerts and updates" });
                iconName = "notifications-outline";
                iconBgColor = theme.colors.amberAccent;
              }

              return (
                <Card
                  key={catKey}
                  variant="elevated"
                  style={[
                    isWarmBackground ? styles.warmCard : styles.card,
                    isWarmBackground ? { backgroundColor: theme.colors.surface } : null
                  ]}
                  padding="none"
                >
                  {/* Subtle gold accent indicator line at the top */}
                  <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

                  <View style={styles.cardInnerPadding}>
                    <View style={[styles.catHeader, { flexDirection: rowDirection }]}>
                      <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
                        <Ionicons name={iconName} size={20} color={theme.colors.primary} />
                      </View>
                      <View style={[styles.catTextWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
                        <Text weight="bold" style={styles.catTitle} color={theme.colors.primary}>
                          {title}
                        </Text>
                        <Text color={theme.colors.textSecondary} style={styles.catSubtitle}>
                          {subtitle}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                    <View style={styles.listWrap}>
                      {catItems.map((item) => {
                        const draftIndex = draft.findIndex(
                          (d) => d.typeSlug === item.typeSlug && d.channel === item.channel
                        );

                        return (
                          <PreferenceToggleRow
                            key={`${item.typeSlug}-${item.channel}`}
                            title={getNotificationTypeLabel(item.typeSlug, t)}
                            description={t(`profileScreen.notifications.channels.${item.channel}`)}
                            value={item.enabled}
                            onValueChange={(enabled) => {
                              if (draftIndex !== -1) {
                                setDraft((current) =>
                                  current.map((currentItem, currentIndex) =>
                                    currentIndex === draftIndex
                                      ? { ...currentItem, enabled }
                                      : currentItem,
                                  ),
                                );
                              }
                            }}
                            style={[styles.toggleRow, { flexDirection: rowDirection }]}
                          />
                        );
                      })}
                    </View>
                  </View>
                </Card>
              );
            })}

            <Button
              title={
                putNotificationPreferences.isPending
                  ? t("profileScreen.common.saving")
                  : t("profileScreen.common.save")
              }
              onPress={save}
              disabled={putNotificationPreferences.isPending}
              style={styles.saveButton}
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
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  warmCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  inboxCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  goldAccentLine: {
    height: 3,
    width: "100%",
  },
  cardInnerPadding: {
    padding: 16,
    gap: 12,
  },
  rowPad: {
    paddingHorizontal: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
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
  catHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  catTextWrap: {
    flex: 1,
    alignItems: "flex-start",
  },
  catTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  catSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  listWrap: {
    gap: 4,
  },
  toggleRow: {
    borderBottomWidth: 0,
    paddingVertical: 10,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowLtr: {
    flexDirection: "row",
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    marginTop: 6,
  },
});
