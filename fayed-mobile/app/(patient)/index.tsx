import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Header, LoadingState, Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { usePatientHome } from "../../src/features/patient/journey/hooks";
import { HomeActionCard } from "../../src/features/patient/journey/components/HomeActionCard";
import { SpecialistHorizontalRail } from "../../src/features/patient/journey/components/SpecialistHorizontalRail";

const HORIZONTAL_MARGIN = 18;

export default function PatientHomeScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const homeQuery = usePatientHome();
  const data = homeQuery.data;

  const recentlyVisited = data?.recentlyVisitedPractitioners?.items ?? [];
  const featured = data?.featuredPractitioners;
  const mostBooked = data?.mostBookedTodayPractitioners;
  const topRated = data?.topRatedPractitioners;
  const matchingCard = data?.matchingCard;
  const supportCard = data?.supportCard;

  const showFeatured =
    featured?.status !== "NOT_IMPLEMENTED" &&
    (featured?.items?.length ?? 0) > 0;
  const showMostBooked =
    mostBooked?.status !== "NOT_IMPLEMENTED" &&
    (mostBooked?.items?.length ?? 0) > 0;
  const showTopRated =
    topRated?.status !== "NOT_IMPLEMENTED" &&
    (topRated?.items?.length ?? 0) > 0;
  const showRecentlyVisited = recentlyVisited.length > 0;

  return (
    <Screen
      bg="background"
      style={styles.root}
      edges={["top", "left", "right"]}
    >
      <Header variant="home" />

      {homeQuery.isLoading && !data ? (
        <LoadingState fullScreen />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.quickActions}>
            <QuickAction
              icon="search"
              label={t("home.quickActions.findDoctor")}
              onPress={() => router.push("/(patient)/discovery" as any)}
            />
            <QuickAction
              icon="calendar-outline"
              label={t("home.quickActions.mySessions")}
              onPress={() => router.push("/(patient)/sessions" as any)}
            />
            <QuickAction
              icon="wallet-outline"
              label={t("home.quickActions.payments")}
              onPress={() => router.push("/(patient)/payments" as any)}
            />
          </View>

          <HomeActionCard
            title={t("instantBooking.patient.home.title")}
            subtitle={t("instantBooking.patient.home.subtitle")}
            ctaLabel={t("instantBooking.patient.home.cta")}
            icon="flash-outline"
            onPress={() => router.push("/(patient)/instant-booking" as any)}
          />

          <HomeActionCard
            title={matchingCard?.title || t("home.matching.title")}
            subtitle={
              matchingCard?.description ||
              t("home.matching.body")
            }
            ctaLabel={t("home.matching.cta")}
            icon="git-pull-request-outline"
            onPress={() => {
              if (matchingCard?.ctaKey === "MATCHING_INTRO") {
                router.push("/(patient)/matching/intro" as any);
                return;
              }
              router.push("/(patient)/matching/intro" as any);
            }}
          />

          {showFeatured ? (
            <SpecialistHorizontalRail
              title={featured?.label || t("home.featured.title")}
              items={(featured?.items || []).slice(0, 5)}
              locale={locale}
              variant="featured"
            />
          ) : null}

          {showMostBooked ? (
            <SpecialistHorizontalRail
              title={mostBooked?.label || t("home.mostBookedToday.title")}
              items={mostBooked?.items || []}
              locale={locale}
              variant="default"
            />
          ) : null}

          {showTopRated ? (
            <SpecialistHorizontalRail
              title={topRated?.label || t("home.topRated.title")}
              items={(topRated?.items || []).slice(0, 5)}
              locale={locale}
              variant="topRated"
            />
          ) : null}

          {showRecentlyVisited ? (
            <SpecialistHorizontalRail
              title={
                data?.recentlyVisitedPractitioners?.label ||
                t("home.recentlyVisited.title")
              }
              items={recentlyVisited}
              locale={locale}
              variant="recentlyVisited"
            />
          ) : null}

          <View style={styles.supportWrap}>
            <HomeActionCard
              title={supportCard?.title || t("home.support.title")}
              subtitle={supportCard?.description || t("home.support.body")}
              ctaLabel={t("home.support.cta")}
              icon="headset-outline"
              onPress={() => {
                if (supportCard?.ctaKey === "SUPPORT_HOME") {
                  router.push("/(patient)/support" as any);
                  return;
                }
                router.push("/(patient)/support" as any);
              }}
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={[
        styles.quickActionCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
      ]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text
        variant="caption"
        weight="600"
        style={styles.quickActionLabel}
        numberOfLines={2}
      >
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
  scrollContent: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingTop: 12,
    paddingBottom: 120,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 88,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    textAlign: "center",
    width: "100%",
  },
  supportWrap: {
    marginTop: 2,
  },
});
