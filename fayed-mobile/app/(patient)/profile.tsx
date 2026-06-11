import React from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Screen,
  Header,
  Text,
  ListRow,
  Card,
  SectionHeader,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { usePatientProfile } from "../../src/features/patient/profile/hooks";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
} from "../../src/features/settings/hooks";
import { usePatientUnreadNotificationCount } from "../../src/features/patient/notifications/hooks";
import {
  formatProfileDate,
  getInitials,
} from "../../src/features/patient/profile/account-utils";
import { normalizeProfileGender } from "../../src/features/patient/profile/gender-utils";
import { useGeneralChatUnreadSummary } from "../../src/features/messages/hooks";

export default function PatientProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const moreTitle = t("profileScreen.moreTitle");

  const profileQuery = usePatientProfile();
  const settingsQuery = useMySettings();
  const notificationCenterQuery = usePatientUnreadNotificationCount();
  const notificationPreferencesQuery = useMySettingsNotificationPreferences();
  const messagesSummaryQuery = useGeneralChatUnreadSummary("patient");

  const profile = profileQuery.data?.profile;
  const settings = settingsQuery.data?.item;
  const notificationPreferences =
    notificationPreferencesQuery.data?.item ??
    settings?.notificationPreferences;

  const displayName =
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    t("profileScreen.fallbackName");
  const email = user?.primaryEmail || t("profileScreen.fallbackEmail");
  const phone = user?.primaryPhone || t("profileScreen.none");
  const initials = getInitials(displayName);
  const avatarUri = profile?.avatarDataUrl ?? profile?.avatarUrl ?? null;

  const currentTimezone =
    settings?.preferences.timezone ??
    profile?.timezone ??
    t("profileScreen.none");

  const currentLocale =
    settings?.preferences.locale ??
    profile?.locale ??
    (i18n.language.startsWith("ar") ? "ar" : "en");

  const currentLocaleLabel =
    currentLocale === "ar"
      ? t("profileScreen.language.options.ar")
      : t("profileScreen.language.options.en");

  const canManageNotifications =
    Boolean(notificationPreferences?.items?.length) &&
    (notificationPreferences?.items.length ?? 0) > 0;

  const unreadNotificationCount =
    notificationCenterQuery.data?.item.unreadCount ?? 0;
  const unreadMessagesCount =
    messagesSummaryQuery.data?.item.totalUnreadMessages ?? 0;

  const profileCompletionItems = [
    !profile?.displayName,
    !profile?.dateOfBirth,
    !profile?.gender,
    !profile?.countryCode,
    !profile?.timezone && !settings?.preferences.timezone,
    !profile?.locale,
  ];

  const missingCount = profileCompletionItems.filter(Boolean).length;
  const birthDateLabel =
    formatProfileDate(profile?.dateOfBirth, i18n.language) ??
    t("profileScreen.none");
  const genderKey = normalizeProfileGender(profile?.gender);
  const genderLabel = genderKey
    ? t(`profileScreen.details.genderOptions.${genderKey}` as const)
    : t("profileScreen.none");

  return (
    <Screen bg="background">
      <Header title={moreTitle} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          style={[
            styles.heroCard,
            {
              borderWidth: 1,
              borderColor: theme.colors.borderLight,
              borderRightColor: theme.colors.primary,
            },
          ]}
        >
          <View style={styles.headerBlock}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
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
            )}
            <Text weight="bold" style={styles.name}>
              {displayName}
            </Text>
            <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
              {email}
            </Text>
            <Text
              style={[
                styles.secondaryLine,
                { color: theme.colors.textSecondary },
              ]}
            >
              {phone}
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
            <View style={styles.heroMetaWrap}>
              <View
                style={[
                  styles.heroMetaPill,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.heroMetaText}
                >
                  {t("profileScreen.hub.hero.localeValue", {
                    language: currentLocaleLabel,
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.heroMetaPill,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.heroMetaText}
                >
                  {t("profileScreen.hub.hero.timezoneValue", {
                    timezone: currentTimezone,
                  })}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.heroCaption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("profileScreen.hub.hero.caption")}
            </Text>
          </View>
        </Card>

        {profile && !profile.isOnboardingCompleted ? (
          <Card
            variant="flat"
            style={[
              styles.onboardingBanner,
              {
                borderWidth: 1,
                borderColor: theme.colors.warning,
                backgroundColor: theme.colors.warningLight,
              },
            ]}
          >
            <View style={styles.onboardingBannerRow}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.colors.warning}
              />
              <View style={styles.onboardingBannerText}>
                <Text weight="600" style={styles.onboardingBannerTitle}>
                  {t("profileScreen.hub.onboarding.pendingTitle")}
                </Text>
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.summaryBody}
                >
                  {t("profileScreen.hub.onboarding.pendingBody")}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card
          variant="elevated"
          style={[
            styles.sectionCard,
            { borderWidth: 1, borderColor: theme.colors.borderLight },
          ]}
        >
          <Text weight="bold" style={styles.summaryTitle}>
            {missingCount > 0
              ? t("profileScreen.hub.completion.incompleteTitle", {
                  count: missingCount,
                })
              : t("profileScreen.hub.completion.completeTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.summaryBody}>
            {missingCount > 0
              ? t("profileScreen.hub.completion.incompleteBody")
              : t("profileScreen.hub.completion.completeBody")}
          </Text>
          <View style={styles.snapshotGrid}>
            <View style={styles.snapshotItem}>
              <Text
                color={theme.colors.textSecondary}
                style={styles.snapshotLabel}
              >
                {t("profileScreen.hub.snapshot.birthDate")}
              </Text>
              <Text weight="600">{birthDateLabel}</Text>
            </View>
            <View style={styles.snapshotItem}>
              <Text
                color={theme.colors.textSecondary}
                style={styles.snapshotLabel}
              >
                {t("profileScreen.hub.snapshot.gender")}
              </Text>
              <Text weight="600">{genderLabel}</Text>
            </View>
          </View>
        </Card>

        <SectionHeader
          title={t("profileScreen.moreSections.account")}
          subtitle={t("profileScreen.moreSections.accountSubtitle")}
        />

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
              title={t("profileScreen.hub.rows.personal.title")}
              subtitle={t("profileScreen.hub.rows.personal.subtitle")}
              leftElement={
                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push("/(patient)/profile-details" as any)}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.hub.rows.wallet.title")}
              subtitle={t("profileScreen.hub.rows.wallet.subtitle")}
              leftElement={
                <Ionicons
                  name="wallet-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push("/(patient)/payments" as any)}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.hub.rows.preferences.title")}
              subtitle={t("profileScreen.hub.rows.preferences.subtitle", {
                language: currentLocaleLabel,
                timezone: currentTimezone,
              })}
              leftElement={
                <Ionicons
                  name="language-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() =>
                router.push("/(patient)/profile-preferences" as any)
              }
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.hub.rows.notificationPreferences.title")}
              subtitle={
                canManageNotifications
                  ? t("profileScreen.hub.rows.notificationPreferences.subtitle")
                  : t(
                      "profileScreen.hub.rows.notificationPreferences.unavailableSubtitle",
                    )
              }
              leftElement={
                <Ionicons
                  name="options-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() =>
                router.push("/(patient)/profile-notifications" as any)
              }
              showChevron
            />
          </View>
        </Card>

        <SectionHeader
          title={t("profileScreen.moreSections.contentSupport")}
          subtitle={t("profileScreen.moreSections.contentSupportSubtitle")}
        />

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
              title={t("profileScreen.hub.rows.articles.title")}
              subtitle={t("profileScreen.hub.rows.articles.subtitle")}
              leftElement={
                <Ionicons
                  name="newspaper-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push("/(patient)/articles" as any)}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.hub.rows.messages.title")}
              subtitle={t("profileScreen.hub.rows.messages.subtitle")}
              leftElement={
                <Ionicons
                  name="chatbubbles-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              rightElement={
                unreadMessagesCount > 0 ? (
                  <View
                    style={[
                      styles.inlineBadge,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Text color={theme.colors.primary} weight="600">
                      {unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount)}
                    </Text>
                  </View>
                ) : undefined
              }
              onPress={() => router.push("/(patient)/messages" as any)}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.hub.rows.notificationCenter.title")}
              subtitle={t("profileScreen.hub.rows.notificationCenter.subtitle")}
              leftElement={
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              rightElement={
                unreadNotificationCount > 0 ? (
                  <View
                    style={[
                      styles.inlineBadge,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Text color={theme.colors.primary} weight="600">
                      {unreadNotificationCount > 99
                        ? "99+"
                        : String(unreadNotificationCount)}
                    </Text>
                  </View>
                ) : undefined
              }
              onPress={() => router.push("/(patient)/notifications" as any)}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.hub.rows.support.title")}
              subtitle={t("profileScreen.hub.rows.support.subtitle")}
              leftElement={
                <Ionicons
                  name="help-buoy-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() =>
                router.push("/(patient)/messages?tab=support" as any)
              }
              showChevron
            />
          </View>
        </Card>

        <SectionHeader
          title={t("profileScreen.moreSections.learningPurchases")}
          subtitle={t("profileScreen.moreSections.learningPurchasesSubtitle")}
        />

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
              title={t("profileScreen.more.rows.academy.title")}
              subtitle={t("profileScreen.more.rows.academy.subtitle")}
              leftElement={
                <Ionicons
                  name="school-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push("/(patient)/academy" as any)}
              showChevron
            />
          </View>
          <View style={styles.rowPad}>
            <ListRow
              title={t("profileScreen.more.rows.packages.title")}
              subtitle={t("profileScreen.more.rows.packages.subtitle")}
              leftElement={
                <Ionicons
                  name="layers-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              }
              onPress={() => router.push("/(patient)/package-purchases" as any)}
              showChevron
            />
          </View>
        </Card>

        <SectionHeader
          title={t("profileScreen.moreSections.account")}
          subtitle={t("profileScreen.moreSections.accountLogoutSubtitle")}
        />

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
    paddingVertical: 14,
  },
  heroCard: {
    borderRightWidth: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
  },
  secondaryLine: {
    marginTop: 2,
    fontSize: 12,
  },
  profileIdPill: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  profileIdText: {
    fontSize: 12,
  },
  heroMetaWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  heroMetaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    fontSize: 11,
  },
  heroCaption: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  inlineBadge: {
    minWidth: 28,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  sectionCard: {
    marginTop: 2,
  },
  onboardingBanner: {
    gap: 8,
  },
  onboardingBannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  onboardingBannerText: {
    flex: 1,
  },
  onboardingBannerTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 18,
    marginBottom: 6,
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  snapshotGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },
  snapshotItem: {
    flex: 1,
  },
  snapshotLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  rowPad: {
    paddingHorizontal: 16,
  },
  loadingHint: {
    textAlign: "center",
    fontSize: 13,
  },
});
