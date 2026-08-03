import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/providers/AuthProvider";
import { Card, ErrorState, Header, LoadingState, Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { usePatientHome } from "../../src/features/patient/journey/hooks";
import { HomeActionCard } from "../../src/features/patient/journey/components/HomeActionCard";
import { SpecialistHorizontalRail } from "../../src/features/patient/journey/components/SpecialistHorizontalRail";
import { useAppDirection } from "../../src/i18n/direction";

const HORIZONTAL_MARGIN = 20;

export default function PatientHomeScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user, patientRegistrationNotice, clearPatientRegistrationNotice } = useAuth();
  const router = useRouter();
  const { isRtl, rowDirection, arrowForward } = useAppDirection();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const homeQuery = usePatientHome();
  const data = homeQuery.data;

  const recentlyVisited = data?.recentlyVisitedPractitioners?.items ?? [];
  const featured = data?.featuredPractitioners;
  const mostBooked = data?.mostBookedTodayPractitioners;
  const topRated = data?.topRatedPractitioners;
  const matchingCard = data?.matchingCard;
  const supportCard = data?.supportCard;

  const showFeatured = featured?.status !== "NOT_IMPLEMENTED" && (featured?.items?.length ?? 0) > 0;
  const showMostBooked = mostBooked?.status !== "NOT_IMPLEMENTED" && (mostBooked?.items?.length ?? 0) > 0;
  const showTopRated = topRated?.status !== "NOT_IMPLEMENTED" && (topRated?.items?.length ?? 0) > 0;
  const showRecentlyVisited = recentlyVisited.length > 0;

  const displayName = user?.displayName?.trim() || t("profileScreen.fallbackName");
  const heroTitle = matchingCard?.title || t("home.matching.title");
  const heroBody = matchingCard?.description || t("home.matching.body");

  return (
    <Screen bg="background" style={styles.root} edges={["top", "left", "right"]}>
      <Header variant="home" />

      {patientRegistrationNotice === "phone-not-saved" ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={clearPatientRegistrationNotice}
          style={[styles.phoneNotice, { backgroundColor: theme.colors.surfaceTertiary }]}
        >
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.phoneNoticeText}>{t("auth.patientSignUp.phoneNotSavedNotice")}</Text>
        </TouchableOpacity>
      ) : null}

      {homeQuery.isError ? (
        <ErrorState
          fullScreen
          title={t("home.support.title")}
          message={t("home.support.body")}
          onRetry={() => void homeQuery.refetch()}
          retryText={t("retry")}
        />
      ) : homeQuery.isLoading && !data ? (
        <LoadingState fullScreen />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.greetingRow, { flexDirection: rowDirection }]}>
            <View style={styles.greetingTextWrap}>
              <Text variant="bodySmall" color={theme.colors.textSecondary} style={[styles.greetingEyebrow, { textAlign: isRtl ? "right" : "left" }]}>
                {t("welcome")}
              </Text>
              <Text variant="h2" weight="700" style={[styles.greetingName, { textAlign: isRtl ? "right" : "left" }]} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          </View>

          <Card
            variant="elevated"
            padding="lg"
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.primary,
                borderLeftWidth: isRtl ? 0 : 4,
                borderRightWidth: isRtl ? 4 : 0,
                borderColor: "#C8A979", // Warm Gold accent line
                ...theme.shadows.md,
              },
            ]}
          >
            <View style={[styles.heroIconRow, { flexDirection: rowDirection }]}>
              <View style={[styles.heroIcon, { backgroundColor: "rgba(255, 255, 255, 0.12)" }]}>
                <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={[styles.heroAccentDot, { backgroundColor: "#C8A979" }]} />
            </View>

            <Text
              variant="h2"
              weight="700"
              color="#FFFFFF"
              style={[styles.heroTitle, { textAlign: isRtl ? "right" : "left" }]}
            >
              {heroTitle}
            </Text>

            <Text
              variant="body"
              color="#EEF4EF" // Soft Sage light color
              style={[styles.heroBody, { textAlign: isRtl ? "right" : "left" }]}
            >
              {heroBody}
            </Text>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                router.push("/(patient)/matching/intro" as any);
              }}
              style={[
                styles.heroButton,
                {
                  backgroundColor: "#FFFFFF",
                  flexDirection: rowDirection,
                  // Premium subtle shadow to feel tappable
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              <Text
                variant="button"
                weight="700"
                color="#24564F"
                style={styles.heroButtonText}
              >
                {t("home.matching.cta")}
              </Text>
              <Ionicons
                name={arrowForward as any}
                size={16}
                color="#24564F"
              />
            </TouchableOpacity>
          </Card>

          <View style={styles.quickActionsHeader}>
            <Text variant="title" weight="700" style={{ textAlign: isRtl ? "right" : "left" }}>
              {t("home.quickActions.title")}
            </Text>
          </View>

          <View style={[styles.quickActions, { flexDirection: rowDirection }]}>
            <QuickAction
              icon="search-outline"
              label={t("home.quickActions.findDoctor")}
              tint="mint"
              onPress={() => router.push("/(patient)/discovery" as any)}
            />
            <QuickAction
              icon="calendar-outline"
              label={t("home.quickActions.mySessions")}
              tint="cream"
              onPress={() => router.push("/(patient)/sessions" as any)}
            />
            <QuickAction
              icon="wallet-outline"
              label={t("home.quickActions.payments")}
              tint="blue"
              onPress={() => router.push("/(patient)/payments" as any)}
            />
          </View>

          <View style={styles.supportWrap}>
            <HomeActionCard
              title={supportCard?.title || t("home.support.title")}
              subtitle={supportCard?.description || t("home.support.body")}
              ctaLabel={t("home.support.cta")}
              icon="headset-outline"
              onPress={() => {
                router.push("/(patient)/support" as any);
              }}
            />
          </View>

          {showFeatured ? (
            <SpecialistHorizontalRail
              title={featured?.label || t("home.featured.title")}
              items={(featured?.items || []).slice(0, 5)}
              locale={locale}
              variant="featured"
              currencyCode={featured?.currencyCode}
            />
          ) : null}

          {showMostBooked ? (
            <SpecialistHorizontalRail
              title={mostBooked?.label || t("home.mostBookedToday.title")}
              items={mostBooked?.items || []}
              locale={locale}
              variant="default"
              currencyCode={mostBooked?.currencyCode}
            />
          ) : null}

          {showTopRated ? (
            <SpecialistHorizontalRail
              title={topRated?.label || t("home.topRated.title")}
              items={(topRated?.items || []).slice(0, 5)}
              locale={locale}
              variant="topRated"
              currencyCode={topRated?.currencyCode}
            />
          ) : null}

          {showRecentlyVisited ? (
            <SpecialistHorizontalRail
              title={data?.recentlyVisitedPractitioners?.label || t("home.recentlyVisited.title")}
              items={recentlyVisited}
              locale={locale}
              variant="recentlyVisited"
              currencyCode={data?.recentlyVisitedPractitioners?.currencyCode}
            />
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  tint: "mint" | "cream" | "blue";
  onPress: () => void;
}) {
  const { theme } = useTheme();

  const tintStyles = {
    mint: {
      bubble: "#EEF4EF", // Green Surface
      icon: "#24564F", // Deep Teal
    },
    cream: {
      bubble: "#FCFAF6", // Warm Card
      icon: "#24564F", // Deep Teal (updated for high contrast)
    },
    blue: {
      bubble: "#EEF4EF", // Green Surface
      icon: "#24564F", // Deep Teal
    },
  }[tint];

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.quickActionCard,
        {
          backgroundColor: "#FFFFFF",
          borderColor: "#E8DED0", // Soft border
          borderWidth: 1,
          ...theme.shadows.sm,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: tintStyles.bubble }]}>
        <Ionicons name={icon} size={18} color={tintStyles.icon} />
      </View>
      <Text variant="caption" weight="600" style={[styles.quickActionLabel, { color: "#1F332F" }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingTop: 12,
    paddingBottom: 124,
  },
  greetingRow: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  greetingTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  greetingEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 18,
    lineHeight: 24,
  },
  heroCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  heroIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.82,
  },
  heroTitle: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  heroBody: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: 310,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  heroButtonText: {
    fontSize: 12.5,
    textAlign: "center",
  },
  quickActionsHeader: {
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 74,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    width: "100%",
  },
  supportWrap: {
    marginBottom: 18,
  },
  bottomSpacer: {
    height: 8,
  },
  phoneNotice: {
    marginHorizontal: HORIZONTAL_MARGIN,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
