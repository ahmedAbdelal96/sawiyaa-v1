import React from "react";
import { ScrollView, StyleSheet, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Screen,
  Header,
  Text,
  Card,
  SectionHeader,
  Avatar,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
import { usePatientProfile } from "../../src/features/patient/profile/hooks";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
} from "../../src/features/settings/hooks";
import { usePatientUnreadNotificationCount } from "../../src/features/patient/notifications/hooks";
import { useGeneralChatUnreadSummary } from "../../src/features/messages/hooks";

interface MoreRowProps {
  title: string;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  showDivider?: boolean;
}

function MoreRow({
  title,
  subtitle,
  iconName,
  iconBgColor,
  iconColor,
  onPress,
  rightElement,
  showDivider = true,
}: MoreRowProps) {
  const { theme } = useTheme();
  const { isRtl, rowDirection, chevronForward } = useAppDirection();

  return (
    <View style={styles.rowContainer}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.rowButton, { flexDirection: rowDirection }]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        
        <View style={[styles.rowTextWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text weight="600" style={styles.rowTitle} color={theme.colors.textPrimary}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.rowSubtitle} color={theme.colors.textSecondary}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={[styles.rowRightWrap, { flexDirection: rowDirection }]}>
          {rightElement}
          <Ionicons
            name={chevronForward}
            size={16}
            color={theme.colors.textMuted}
            style={{ opacity: 0.6, marginStart: 6 }}
          />
        </View>
      </TouchableOpacity>
      {showDivider ? (
        <View style={[styles.rowDividerLine, { backgroundColor: theme.colors.divider }]} />
      ) : null}
    </View>
  );
}

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

  const isRTL = i18n.language.startsWith("ar");
  const { rowDirection, chevronForward, isRtl } = useAppDirection();

  return (
    <Screen bg="background">
      <Header title={moreTitle} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Identity Card */}
        <Card
          variant="elevated"
          style={styles.heroCard}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={[styles.heroRow, { flexDirection: rowDirection }]}>
            <Avatar name={displayName} source={avatarUri ? { uri: avatarUri } : null} size={64} label={displayName} />
            <View style={[styles.heroTextWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
              <Text weight="bold" style={styles.name} color={theme.colors.primary}>
                {displayName}
              </Text>
              <Text style={styles.email} color={theme.colors.textSecondary}>
                {email}
              </Text>
              
              <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
                <Text style={styles.metaLabel} color={theme.colors.textMuted} numberOfLines={1}>
                  P-{(user?.id ?? "0000").slice(0, 4).toUpperCase()}  •  {currentLocaleLabel}  •  {currentTimezone}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.heroDivider, { backgroundColor: theme.colors.divider }]} />
          
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(patient)/profile-details" as any)}
            style={[styles.viewProfileRow, { flexDirection: rowDirection }]}
          >
            <Text weight="600" color={theme.colors.primary} style={styles.viewProfileText}>
              {t("profileScreen.details.screenTitle") || "عرض الملف الشخصي"}
            </Text>
            <Ionicons
              name={chevronForward}
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </Card>

        {/* Onboarding Pending Banner */}
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
            <View style={[styles.onboardingBannerRow, isRTL ? styles.rowRtl : styles.rowLtr]}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.colors.warning}
              />
              <View style={styles.onboardingBannerText}>
                <Text weight="600" style={styles.onboardingBannerTitle} color={theme.colors.textPrimary}>
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

        {/* Group 1: Account Details & Wallet - Pure White Card */}
        <SectionHeader
          title={t("profileScreen.moreSections.account")}
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        />
        <Card variant="elevated" style={styles.groupedCardWhite} padding="none">
          <MoreRow
            title={t("profileScreen.hub.rows.personal.title")}
            subtitle={t("profileScreen.hub.rows.personal.subtitle")}
            iconName="person-outline"
            iconBgColor={theme.colors.mintAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/profile-details" as any)}
          />
          <MoreRow
            title={t("profileScreen.hub.rows.wallet.title")}
            subtitle={t("profileScreen.hub.rows.wallet.subtitle")}
            iconName="wallet-outline"
            iconBgColor={theme.colors.mintAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/payments" as any)}
          />
          <MoreRow
            title={t("profileScreen.hub.rows.messages.title")}
            subtitle={t("profileScreen.hub.rows.messages.subtitle")}
            iconName="chatbubbles-outline"
            iconBgColor={theme.colors.mintAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/messages" as any)}
            rightElement={
              unreadMessagesCount > 0 ? (
                <View style={[styles.inlineBadge, { backgroundColor: theme.colors.primarySoft }]}>
                  <Text color={theme.colors.primary} weight="700" style={styles.badgeText}>
                    {unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount)}
                  </Text>
                </View>
              ) : undefined
            }
          />
          <MoreRow
            title={t("profileScreen.hub.rows.notificationCenter.title")}
            subtitle={t("profileScreen.hub.rows.notificationCenter.subtitle")}
            iconName="notifications-outline"
            iconBgColor={theme.colors.mintAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/notifications" as any)}
            rightElement={
              unreadNotificationCount > 0 ? (
                <View style={[styles.inlineBadge, { backgroundColor: theme.colors.primarySoft }]}>
                  <Text color={theme.colors.primary} weight="700" style={styles.badgeText}>
                    {unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount)}
                  </Text>
                </View>
              ) : undefined
            }
            showDivider={false}
          />
        </Card>

        {/* Group 2: Preferences - Warm Card to create rhythm variety */}
        <SectionHeader
          title={t("profileScreen.hub.rows.preferences.title") || "التفضيلات"}
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        />
        <Card variant="elevated" style={[styles.groupedCardWarm, { backgroundColor: theme.colors.surface }]} padding="none">
          <MoreRow
            title={t("profileScreen.language.title") || "اللغة"}
            subtitle={currentLocaleLabel}
            iconName="language-outline"
            iconBgColor="#E8F1F8"
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/profile-preferences" as any)}
          />
          <MoreRow
            title={t("profileScreen.preferences.timezoneTitle") || "المنطقة الزمنية"}
            subtitle={currentTimezone}
            iconName="time-outline"
            iconBgColor="#E8F1F8"
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/profile-preferences" as any)}
          />
          <MoreRow
            title={t("profileScreen.notifications.screenTitle") || "إعدادات الإشعارات"}
            subtitle={
              canManageNotifications
                ? t("profileScreen.hub.rows.notificationPreferences.subtitle")
                : t("profileScreen.hub.rows.notificationPreferences.unavailableSubtitle")
            }
            iconName="options-outline"
            iconBgColor="#E8F1F8"
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/profile-notifications" as any)}
            showDivider={false}
          />
        </Card>

        {/* Group 3: Learning & Purchases - Pure White Card */}
        <SectionHeader
          title={t("profileScreen.moreSections.learningPurchases")}
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        />
        <Card variant="elevated" style={styles.groupedCardWhite} padding="none">
          <MoreRow
            title={t("profileScreen.hub.rows.articles.title")}
            subtitle={t("profileScreen.hub.rows.articles.subtitle")}
            iconName="newspaper-outline"
            iconBgColor={theme.colors.amberAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/articles" as any)}
          />
          <MoreRow
            title={t("profileScreen.more.rows.academy.title")}
            subtitle={t("profileScreen.more.rows.academy.subtitle")}
            iconName="school-outline"
            iconBgColor={theme.colors.amberAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/academy" as any)}
          />
          <MoreRow
            title={t("profileScreen.more.rows.packages.title")}
            subtitle={t("profileScreen.more.rows.packages.subtitle")}
            iconName="layers-outline"
            iconBgColor={theme.colors.amberAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/package-purchases" as any)}
            showDivider={false}
          />
        </Card>

        {/* Group 4: Support - Warm Card */}
        <SectionHeader
          title={t("profileScreen.moreSections.contentSupport")}
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        />
        <Card variant="elevated" style={[styles.groupedCardWarm, { backgroundColor: theme.colors.surface }]} padding="none">
          <MoreRow
            title={t("profileScreen.hub.rows.support.title")}
            subtitle={t("profileScreen.hub.rows.support.subtitle")}
            iconName="help-buoy-outline"
            iconBgColor={theme.colors.mintAccent}
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/messages?tab=support" as any)}
            showDivider={false}
          />
        </Card>

        {/* Group 5: Logout - Distinct visual component */}
        <SectionHeader
          title={t("profileScreen.moreSections.account")}
          subtitle={t("profileScreen.moreSections.accountLogoutSubtitle")}
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={signOut}
          style={[styles.logoutButton, { flexDirection: rowDirection }]}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginEnd: 8 }} />
          <Text weight="700" color="#ef4444" style={styles.logoutText}>
            {t("profileScreen.logout")}
          </Text>
        </TouchableOpacity>

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
  heroCard: {
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
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
    alignItems: "flex-start",
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowLtr: {
    flexDirection: "row",
  },
  name: {
    fontSize: 20,
    lineHeight: 26,
  },
  email: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  heroDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  viewProfileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  viewProfileText: {
    fontSize: 13,
  },
  onboardingBanner: {
    gap: 8,
    borderRadius: 20,
  },
  onboardingBannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  onboardingBannerText: {
    flex: 1,
    alignItems: "flex-start",
  },
  onboardingBannerTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  groupedCardWhite: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    marginTop: 2,
    paddingVertical: 4,
  },
  groupedCardWarm: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DED0",
    marginTop: 2,
    paddingVertical: 4,
  },
  rowContainer: {
    width: "100%",
  },
  rowButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowTextWrap: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "flex-start",
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  rowRightWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowDividerLine: {
    height: 1,
    marginHorizontal: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineBadge: {
    minWidth: 26,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
  },
  logoutButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  logoutText: {
    fontSize: 15,
  },
  loadingHint: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 10,
  },
});
