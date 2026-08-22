import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Avatar, Card, Header, Screen, SectionHeader, Text } from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
import { usePatientProfile } from "../../src/features/patient/profile/hooks";

interface MoreRowProps {
  title: string;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
  showDivider?: boolean;
}

function MoreRow({
  title,
  subtitle,
  iconName,
  iconBgColor,
  iconColor,
  onPress,
  showDivider = true,
}: MoreRowProps) {
  const { theme } = useTheme();
  const { isRtl, rowDirection, chevronForward } = useAppDirection();

  return (
    <View style={styles.rowContainer}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
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
        <Ionicons name={chevronForward} size={16} color={theme.colors.textMuted} style={styles.chevron} />
      </TouchableOpacity>
      {showDivider ? <View style={[styles.rowDividerLine, { backgroundColor: theme.colors.divider }]} /> : null}
    </View>
  );
}

export default function PatientProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { rowDirection, chevronForward, isRtl } = useAppDirection();
  const isArabic = i18n.language.startsWith("ar");
  const profileQuery = usePatientProfile();
  const profile = profileQuery.data?.profile;
  const displayName = profile?.displayName?.trim() || user?.displayName?.trim() || t("profileScreen.fallbackName");
  const email = user?.primaryEmail || t("profileScreen.fallbackEmail");
  const avatarUri = profile?.avatarDataUrl ?? profile?.avatarUrl ?? null;

  return (
    <Screen bg="background" testID="patient-more-screen">
      <Header title={t("profileScreen.moreTitle")} hideMessages />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card variant="elevated" style={styles.heroCard} padding="none">
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />
          <View style={[styles.heroRow, { flexDirection: rowDirection }]}>
            <Avatar name={displayName} source={avatarUri ? { uri: avatarUri } : null} size={64} label={displayName} />
            <View style={[styles.heroTextWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
              <Text weight="bold" style={styles.name} color={theme.colors.primary}>{displayName}</Text>
              <Text style={styles.email} color={theme.colors.textSecondary}>{email}</Text>
            </View>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: theme.colors.divider }]} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("profileScreen.details.screenTitle")}
            activeOpacity={0.7}
            onPress={() => router.push("/(patient)/profile-details" as any)}
            style={[styles.viewProfileRow, { flexDirection: rowDirection }]}
          >
            <Text weight="600" color={theme.colors.primary} style={styles.viewProfileText}>{t("profileScreen.details.screenTitle")}</Text>
            <Ionicons name={chevronForward} size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </Card>

        {profile && !profile.isOnboardingCompleted ? (
          <Card variant="flat" style={[styles.onboardingBanner, { borderColor: theme.colors.warning, backgroundColor: theme.colors.warningLight }]}>
            <View style={[styles.onboardingBannerRow, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
              <View style={styles.onboardingBannerText}>
                <Text weight="600" style={styles.onboardingBannerTitle} color={theme.colors.textPrimary}>{t("profileScreen.hub.onboarding.pendingTitle")}</Text>
                <Text color={theme.colors.textSecondary} style={styles.summaryBody}>{t("profileScreen.hub.onboarding.pendingBody")}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <SectionHeader title={t("profileScreen.moreSections.account")} style={{ flexDirection: isArabic ? "row-reverse" : "row" }} />
        <Card variant="elevated" style={styles.groupedCard} padding="none">
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
            showDivider={false}
          />
        </Card>

        <SectionHeader title={t("profileScreen.hub.rows.preferences.title")} style={{ flexDirection: isArabic ? "row-reverse" : "row" }} />
        <Card variant="elevated" style={[styles.groupedCard, { backgroundColor: theme.colors.surface }]} padding="none">
          <MoreRow
            title={t("settings.title")}
            subtitle={t("profileScreen.preferences.summary")}
            iconName="settings-outline"
            iconBgColor="#E8F1F8"
            iconColor={theme.colors.primary}
            onPress={() => router.push("/(patient)/profile-preferences" as any)}
            showDivider={false}
          />
        </Card>

        <SectionHeader title={t("profileScreen.moreSections.learningPurchases")} style={{ flexDirection: isArabic ? "row-reverse" : "row" }} />
        <Card variant="elevated" style={styles.groupedCard} padding="none">
          <MoreRow title={t("profileScreen.hub.rows.articles.title")} subtitle={t("profileScreen.hub.rows.articles.subtitle")} iconName="newspaper-outline" iconBgColor={theme.colors.amberAccent} iconColor={theme.colors.primary} onPress={() => router.push("/(patient)/articles" as any)} />
          <MoreRow title={t("profileScreen.more.rows.academy.title")} subtitle={t("profileScreen.more.rows.academy.subtitle")} iconName="school-outline" iconBgColor={theme.colors.amberAccent} iconColor={theme.colors.primary} onPress={() => router.push("/(patient)/academy" as any)} />
          <MoreRow title={t("profileScreen.more.rows.packages.title")} subtitle={t("profileScreen.more.rows.packages.subtitle")} iconName="layers-outline" iconBgColor={theme.colors.amberAccent} iconColor={theme.colors.primary} onPress={() => router.push("/(patient)/package-purchases" as any)} showDivider={false} />
        </Card>

        <SectionHeader title={t("profileScreen.moreSections.contentSupport")} style={{ flexDirection: isArabic ? "row-reverse" : "row" }} />
        <Card variant="elevated" style={[styles.groupedCard, { backgroundColor: theme.colors.surface }]} padding="none">
          <MoreRow title={t("profileScreen.hub.rows.support.title")} subtitle={t("profileScreen.hub.rows.support.subtitle")} iconName="help-buoy-outline" iconBgColor={theme.colors.mintAccent} iconColor={theme.colors.primary} onPress={() => router.push("/(patient)/messages?tab=support" as any)} showDivider={false} />
        </Card>

        <SectionHeader title={t("profileScreen.moreSections.account")} subtitle={t("profileScreen.moreSections.accountLogoutSubtitle")} style={{ flexDirection: isArabic ? "row-reverse" : "row" }} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("profileScreen.logout")} activeOpacity={0.7} onPress={signOut} style={[styles.logoutButton, { flexDirection: rowDirection }]}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={styles.logoutIcon} />
          <Text weight="700" color="#ef4444" style={styles.logoutText}>{t("profileScreen.logout")}</Text>
        </TouchableOpacity>

        {profileQuery.isLoading ? <Text color={theme.colors.textSecondary} style={styles.loadingHint}>{t("profileScreen.common.loading")}</Text> : null}
        {profileQuery.isError ? <Text color="#ef4444" style={styles.loadingHint}>{t("profileScreen.common.syncWarning")}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 14 },
  heroCard: { borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DED0", overflow: "hidden" },
  goldAccentLine: { height: 3, width: "100%" },
  heroRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 16 },
  heroTextWrap: { flex: 1, gap: 4, alignItems: "flex-start" },
  name: { fontSize: 20, lineHeight: 26 },
  email: { fontSize: 13, lineHeight: 18 },
  heroDivider: { height: 1, marginHorizontal: 16 },
  viewProfileRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  viewProfileText: { fontSize: 13 },
  onboardingBanner: { gap: 8, borderRadius: 20, borderWidth: 1 },
  onboardingBannerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  onboardingBannerText: { flex: 1, alignItems: "flex-start" },
  onboardingBannerTitle: { fontSize: 15, marginBottom: 4 },
  summaryBody: { fontSize: 13, lineHeight: 20 },
  groupedCard: { borderRadius: 20, borderWidth: 1, borderColor: "#E8DED0", marginTop: 2, paddingVertical: 4 },
  rowContainer: { width: "100%" },
  rowButton: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  rowTextWrap: { flex: 1, marginHorizontal: 12, alignItems: "flex-start" },
  rowTitle: { fontSize: 15, lineHeight: 20 },
  rowSubtitle: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  iconWrapper: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  chevron: { opacity: 0.6, marginStart: 6 },
  rowDividerLine: { height: 1, marginHorizontal: 16 },
  logoutButton: { borderRadius: 20, borderWidth: 1, borderColor: "#FEE2E2", backgroundColor: "#FEF2F2", paddingVertical: 16, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", marginTop: 2 },
  logoutIcon: { marginEnd: 8 },
  logoutText: { fontSize: 15 },
  loadingHint: { textAlign: "center", fontSize: 13, marginTop: 10 },
});
