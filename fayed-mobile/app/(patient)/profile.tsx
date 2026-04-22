import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen, Header, Text, ListRow, Card } from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  usePatchPatientProfile,
  usePatientProfile,
} from "../../src/features/patient/profile/hooks";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
  usePatchMySettingsPreferences,
  usePutMySettingsNotificationPreferences,
} from "../../src/features/settings/hooks";
import type { SettingsLocale } from "../../src/features/settings/types";
import type { UpdatePatientProfilePayload } from "../../src/features/patient/profile/types";
import { Input, Button } from "../../src/components/ui";
import { setAppLanguage } from "../../src/i18n";

function formatNotificationType(typeSlug: string) {
  return typeSlug
    .split("_")
    .filter(Boolean)
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(name: string | null) {
  if (!name?.trim()) {
    return "P";
  }

  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeCountryCode(value: string) {
  const next = value.trim().toUpperCase();
  if (!next) {
    return null;
  }

  return next;
}

export default function PatientProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();

  const profileQuery = usePatientProfile();
  const patchProfile = usePatchPatientProfile();
  const settingsQuery = useMySettings();
  const notificationPreferencesQuery = useMySettingsNotificationPreferences();
  const patchSettingsPreferences = usePatchMySettingsPreferences();
  const putNotificationPreferences = usePutMySettingsNotificationPreferences();

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] =
    useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    countryCode: "",
    timezone: "",
  });
  const [selectedLanguage, setSelectedLanguage] = useState<SettingsLocale>(
    i18n.language.startsWith("ar") ? "ar" : "en",
  );
  const [notificationDraft, setNotificationDraft] = useState<
    Array<{ typeSlug: string; channel: "IN_APP" | "EMAIL"; enabled: boolean }>
  >([]);

  const profile = profileQuery.data?.profile;
  const settings = settingsQuery.data?.item;
  const notificationPreferences =
    notificationPreferencesQuery.data?.item ??
    settings?.notificationPreferences;

  useEffect(() => {
    const nextLanguage = (settings?.preferences.locale ??
      (i18n.language.startsWith("ar") ? "ar" : "en")) as SettingsLocale;
    setSelectedLanguage(nextLanguage);
  }, [i18n.language, settings?.preferences.locale]);

  const displayName =
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    t("profileScreen.fallbackName");
  const email = user?.primaryEmail || t("profileScreen.fallbackEmail");
  const initials = getInitials(displayName);

  const currentTimezone =
    settings?.preferences.timezone ??
    profile?.timezone ??
    t("profileScreen.none");

  const currentLocaleLabel =
    selectedLanguage === "ar"
      ? t("profileScreen.language.options.ar")
      : t("profileScreen.language.options.en");

  const canManageNotifications =
    Boolean(notificationPreferences?.items?.length) &&
    (notificationPreferences?.items.length ?? 0) > 0;

  const isBusy =
    patchProfile.isPending ||
    patchSettingsPreferences.isPending ||
    putNotificationPreferences.isPending;

  const openDetailsModal = () => {
    setProfileForm({
      displayName: profile?.displayName ?? user?.displayName ?? "",
      countryCode: profile?.countryCode ?? "",
      timezone:
        profile?.timezone ??
        settings?.preferences.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone ??
        "",
    });
    setDetailsModalVisible(true);
  };

  const saveDetails = async () => {
    const countryCode = normalizeCountryCode(profileForm.countryCode);

    if (countryCode && !/^[A-Z]{2,3}$/.test(countryCode)) {
      Alert.alert(
        t("profileScreen.details.invalidCountryTitle"),
        t("profileScreen.details.invalidCountryBody"),
      );
      return;
    }

    const payload: UpdatePatientProfilePayload = {
      displayName: profileForm.displayName.trim() || undefined,
      countryCode,
      timezone: profileForm.timezone.trim() || undefined,
    };

    try {
      await patchProfile.mutateAsync(payload);
      setDetailsModalVisible(false);
    } catch {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        t("profileScreen.details.saveFailedBody"),
      );
    }
  };

  const applyLanguage = async () => {
    const timezoneCandidate =
      settings?.preferences.timezone ??
      profile?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      await patchSettingsPreferences.mutateAsync({
        locale: selectedLanguage,
        timezone: timezoneCandidate,
      });

      const result = await setAppLanguage(selectedLanguage);
      setLanguageModalVisible(false);

      if (result.requiresRestart) {
        Alert.alert(
          t("profileScreen.language.restartTitle"),
          t("profileScreen.language.restartBody"),
        );
      }
    } catch {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        t("profileScreen.language.saveFailedBody"),
      );
    }
  };

  const openNotificationsModal = () => {
    if (!notificationPreferences) {
      return;
    }

    setNotificationDraft(
      notificationPreferences.items.map((item) => ({
        typeSlug: item.typeSlug,
        channel: item.channel,
        enabled: item.enabled,
      })),
    );
    setNotificationsModalVisible(true);
  };

  const toggleNotification = (index: number, enabled: boolean) => {
    setNotificationDraft((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, enabled } : item,
      ),
    );
  };

  const saveNotificationPreferences = async () => {
    try {
      await putNotificationPreferences.mutateAsync({
        items: notificationDraft,
      });
      setNotificationsModalVisible(false);
    } catch {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        t("profileScreen.notifications.saveFailedBody"),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header title={t("profile")} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          style={[
            styles.heroCard,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
        >
          <View style={styles.headerBlock}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Text
                weight="bold"
                style={[styles.avatarText, { color: theme.colors.primary }]}
              >
                {initials || "P"}
              </Text>
            </View>
            <Text weight="bold" style={styles.name}>
              {displayName}
            </Text>
            <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
              {email}
            </Text>
            <View
              style={[
                styles.profileIdPill,
                { backgroundColor: theme.colors.surfaceTertiary },
              ]}
            >
              <Ionicons
                name="id-card-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text
                color={theme.colors.textSecondary}
                style={styles.profileIdText}
              >
                ID: P-{(user?.id ?? "0000").slice(0, 4).toUpperCase()}
              </Text>
            </View>
          </View>
        </Card>

        <Card
          variant="elevated"
          style={[
            styles.sectionCard,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
          padding="none"
        >
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.details.title")}
              subtitle={t("profileScreen.details.subtitle")}
              leftElement={
                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={openDetailsModal}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.wallet.title")}
              subtitle={t("profileScreen.wallet.subtitle")}
              leftElement={
                <Ionicons
                  name="wallet-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              rightElement={
                <Text weight="bold" color={theme.colors.textSecondary}>
                  {t("profileScreen.wallet.unavailableAmount")}
                </Text>
              }
            />
          </View>
        </Card>

        <Card
          variant="elevated"
          style={[
            styles.sectionCard,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
          padding="none"
        >
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.language.title")}
              subtitle={t("profileScreen.language.subtitle")}
              leftElement={
                <Ionicons
                  name="language-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              rightElement={<Text>{currentLocaleLabel}</Text>}
              onPress={() => setLanguageModalVisible(true)}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.notifications.title")}
              subtitle={
                canManageNotifications
                  ? t("profileScreen.notifications.subtitle")
                  : t("profileScreen.notifications.unavailableSubtitle")
              }
              leftElement={
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={
                canManageNotifications ? openNotificationsModal : undefined
              }
              showChevron={canManageNotifications}
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.support.title")}
              subtitle={t("support.newTicket", "Open a support request")}
              leftElement={
                <Ionicons
                  name="help-buoy-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push("/(patient)/support" as any)}
              showChevron
            />
          </View>
        </Card>

        <Card
          variant="elevated"
          style={[
            styles.sectionCard,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
          padding="none"
        >
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.logout")}
              onPress={signOut}
              rightElement={
                <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              }
            />
          </View>
        </Card>

        {(profileQuery.isLoading || settingsQuery.isLoading) && (
          <Text color={theme.colors.textSecondary} style={styles.loadingHint}>
            {t("profileScreen.common.loading")}
          </Text>
        )}

        {(profileQuery.isError || settingsQuery.isError) && (
          <Text color="#ef4444" style={styles.loadingHint}>
            {t("profileScreen.common.syncWarning")}
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card variant="elevated" style={styles.modalCard}>
            <Text weight="bold" style={styles.modalTitle}>
              {t("profileScreen.details.modalTitle")}
            </Text>
            <Input
              label={t("profileScreen.details.fields.displayName")}
              value={profileForm.displayName}
              onChangeText={(value) =>
                setProfileForm((current) => ({
                  ...current,
                  displayName: value,
                }))
              }
            />
            <Input
              label={t("profileScreen.details.fields.countryCode")}
              value={profileForm.countryCode}
              autoCapitalize="characters"
              maxLength={3}
              onChangeText={(value) =>
                setProfileForm((current) => ({
                  ...current,
                  countryCode: value,
                }))
              }
            />
            <Input
              label={t("profileScreen.details.fields.timezone")}
              value={profileForm.timezone}
              onChangeText={(value) =>
                setProfileForm((current) => ({ ...current, timezone: value }))
              }
            />
            <View style={styles.modalActions}>
              <View style={styles.modalActionHalf}>
                <Button
                  title={t("profileScreen.common.cancel")}
                  variant="secondary"
                  onPress={() => setDetailsModalVisible(false)}
                  disabled={isBusy}
                />
              </View>
              <View style={styles.modalActionHalf}>
                <Button
                  title={t("profileScreen.common.save")}
                  onPress={saveDetails}
                  disabled={isBusy}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card variant="elevated" style={styles.modalCard}>
            <Text weight="bold" style={styles.modalTitle}>
              {t("profileScreen.language.modalTitle")}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.choiceRow}
              onPress={() => setSelectedLanguage("ar")}
            >
              <Text>{t("profileScreen.language.options.ar")}</Text>
              {selectedLanguage === "ar" ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.primary}
                />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.choiceRow}
              onPress={() => setSelectedLanguage("en")}
            >
              <Text>{t("profileScreen.language.options.en")}</Text>
              {selectedLanguage === "en" ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.primary}
                />
              ) : null}
            </TouchableOpacity>

            <Text color={theme.colors.textSecondary} style={styles.modalMeta}>
              {t("profileScreen.language.currentTimezone", {
                timezone: currentTimezone,
              })}
            </Text>

            <View style={styles.modalActions}>
              <View style={styles.modalActionHalf}>
                <Button
                  title={t("profileScreen.common.cancel")}
                  variant="secondary"
                  onPress={() => setLanguageModalVisible(false)}
                  disabled={isBusy}
                />
              </View>
              <View style={styles.modalActionHalf}>
                <Button
                  title={t("profileScreen.common.apply")}
                  onPress={applyLanguage}
                  disabled={isBusy}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>

      <Modal
        visible={notificationsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card variant="elevated" style={styles.modalCard}>
            <Text weight="bold" style={styles.modalTitle}>
              {t("profileScreen.notifications.modalTitle")}
            </Text>

            <ScrollView
              style={styles.notificationsScroll}
              contentContainerStyle={styles.notificationsContent}
            >
              {notificationDraft.map((item, index) => (
                <View
                  key={`${item.typeSlug}-${item.channel}`}
                  style={styles.notificationRow}
                >
                  <View style={styles.notificationTextWrap}>
                    <Text weight="500">
                      {formatNotificationType(item.typeSlug)}
                    </Text>
                    <Text
                      color={theme.colors.textSecondary}
                      style={styles.notificationMeta}
                    >
                      {item.channel}
                    </Text>
                  </View>
                  <Switch
                    value={item.enabled}
                    onValueChange={(value) => toggleNotification(index, value)}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <View style={styles.modalActionHalf}>
                <Button
                  title={t("profileScreen.common.cancel")}
                  variant="secondary"
                  onPress={() => setNotificationsModalVisible(false)}
                  disabled={isBusy}
                />
              </View>
              <View style={styles.modalActionHalf}>
                <Button
                  title={t("profileScreen.common.save")}
                  onPress={saveNotificationPreferences}
                  disabled={isBusy}
                />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
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
  headerBlock: {
    alignItems: "center",
    paddingVertical: 18,
  },
  heroCard: {
    borderRightWidth: 4,
    borderRightColor: "#3f7dcf",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
  },
  name: {
    fontSize: 34,
    lineHeight: 38,
    marginBottom: 6,
  },
  email: {
    fontSize: 15,
  },
  profileIdPill: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profileIdText: {
    fontSize: 13,
  },
  sectionCard: {
    marginTop: 2,
  },
  rowPad: {
    paddingHorizontal: 16,
  },
  loadingHint: {
    textAlign: "center",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalActionHalf: {
    flex: 1,
  },
  choiceRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },
  modalMeta: {
    marginTop: 10,
    marginBottom: 14,
    fontSize: 12,
  },
  notificationsScroll: {
    maxHeight: 300,
    marginBottom: 12,
  },
  notificationsContent: {
    gap: 10,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
    paddingBottom: 8,
  },
  notificationTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  notificationMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
