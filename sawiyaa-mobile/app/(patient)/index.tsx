import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/providers/AuthProvider";
import { Card, ErrorState, Header, LoadingState, Screen, Text } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { usePatientHome } from "../../src/features/patient/journey/hooks";
import { SpecialistHorizontalRail } from "../../src/features/patient/journey/components/SpecialistHorizontalRail";
import { useAppDirection } from "../../src/i18n/direction";
import { formatPatientDateTime } from "../../src/lib/time-formatting";
import { useMyNextSession, type MobileNextSession } from "../../src/features/sessions/next-session";
import { resolvePatientHomePrimaryState } from "../../src/features/patient/journey/home-view-model";

const HORIZONTAL_MARGIN = 20;

export default function PatientHomeScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user, patientRegistrationNotice, clearPatientRegistrationNotice } = useAuth();
  const router = useRouter();
  const { isRtl, rowDirection } = useAppDirection();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const nextSessionQuery = useMyNextSession();
  const homeQuery = usePatientHome({
    enabled: !nextSessionQuery.isPending && !nextSessionQuery.data,
  });
  const nextSession = nextSessionQuery.data ?? null;
  const data = homeQuery.data;

  const recentlyVisited = data?.recentlyVisitedPractitioners?.items ?? [];
  const featured = data?.featuredPractitioners;
  const mostBooked = data?.mostBookedTodayPractitioners;
  const topRated = data?.topRatedPractitioners;

  const showFeatured = featured?.status !== "NOT_IMPLEMENTED" && (featured?.items?.length ?? 0) > 0;
  const showMostBooked = mostBooked?.status !== "NOT_IMPLEMENTED" && (mostBooked?.items?.length ?? 0) > 0;
  const showTopRated = topRated?.status !== "NOT_IMPLEMENTED" && (topRated?.items?.length ?? 0) > 0;
  const showRecentlyVisited = recentlyVisited.length > 0;

  const displayName = user?.displayName?.trim() || t("profileScreen.fallbackName");
  const homeError = !nextSession && homeQuery.isError;
  const homeLoading =
    !nextSession &&
    (nextSessionQuery.isPending || (homeQuery.isLoading && !data));

  return (
    <Screen bg="background" testID="patient-home-screen" style={styles.root} edges={["top", "left", "right"]}>
      <Header variant="home" hideMessages />

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

      {homeError ? (
        <ErrorState
          fullScreen
          title={t("home.error.title")}
          message={t("home.error.body")}
          onRetry={() => {
            void nextSessionQuery.refetch();
            void homeQuery.refetch();
          }}
          retryText={t("retry")}
        />
      ) : homeLoading ? (
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

          {nextSession ? (
            <PatientHomeSessionSurface session={nextSession} />
          ) : (
            <PatientHomeDiscoverySurface
              onPress={() => router.push("/(patient)/matching/intro" as any)}
            />
          )}

          {!nextSession && showFeatured ? (
            <SpecialistHorizontalRail
              title={featured?.label || t("home.featured.title")}
              items={(featured?.items || []).slice(0, 5)}
              locale={locale}
              variant="featured"
              currencyCode={featured?.currencyCode}
            />
          ) : null}

          {!nextSession && showMostBooked ? (
            <SpecialistHorizontalRail
              title={mostBooked?.label || t("home.mostBookedToday.title")}
              items={mostBooked?.items || []}
              locale={locale}
              variant="default"
              currencyCode={mostBooked?.currencyCode}
            />
          ) : null}

          {!nextSession && showTopRated ? (
            <SpecialistHorizontalRail
              title={topRated?.label || t("home.topRated.title")}
              items={(topRated?.items || []).slice(0, 5)}
              locale={locale}
              variant="topRated"
              currencyCode={topRated?.currencyCode}
            />
          ) : null}

          {!nextSession && showRecentlyVisited ? (
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

function PatientHomeSessionSurface({ session }: { session: MobileNextSession }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { isRtl, rowDirection, arrowForward } = useAppDirection();
  const router = useRouter();

  const primaryState = resolvePatientHomePrimaryState(session);
  const kind = primaryState === "PAYMENT_REQUIRED" ? "payment" : primaryState === "JOINABLE" ? "join" : "upcoming";
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const displayTime = formatPatientDateTime(session.startsAt, session.displayTimezone, {
    locale,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const copy = {
    payment: {
      title: t("home.session.paymentTitle"),
      status: t("home.session.paymentStatus"),
      cta: t("home.session.pay"),
      route: `/(patient)/sessions/${session.sessionId}/pay`,
    },
    join: {
      title: t("home.session.joinTitle"),
      status: t("home.session.joinStatus"),
      cta: t("home.session.join"),
      route: session.joinRoute,
    },
    upcoming: {
      title: t("home.session.upcomingTitle"),
      status: t("home.session.upcomingStatus"),
      cta: t("home.session.view"),
      route: session.detailsRoute,
    },
  }[kind];

  return (
    <Card variant="outlined" padding="lg" style={[styles.primarySurface, { borderColor: theme.colors.primary }]}>
      <View style={[styles.primaryHeader, { flexDirection: rowDirection }]}>
        <View style={styles.primaryHeaderCopy}>
          <Text color={theme.colors.primary} weight="700" style={{ textAlign: isRtl ? "right" : "left" }}>
            {copy.title}
          </Text>
          <Text variant="h2" weight="700" style={[styles.primaryName, { textAlign: isRtl ? "right" : "left" }]} numberOfLines={1}>
            {session.counterpart.displayName || t("home.session.specialistFallback")}
          </Text>
        </View>
        <Ionicons name={kind === "payment" ? "card-outline" : kind === "join" ? "videocam-outline" : "calendar-outline"} size={24} color={theme.colors.primary} />
      </View>
      <Text color={theme.colors.textSecondary} style={[styles.primaryDetails, { textAlign: isRtl ? "right" : "left" }]}>
        {displayTime} {"\u2022"} {t("home.session.duration", { count: session.durationMinutes })}
      </Text>
      <Text color={theme.colors.primary} weight="700" style={[styles.primaryStatus, { textAlign: isRtl ? "right" : "left" }]}>
        {copy.status}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={copy.cta}
        activeOpacity={0.88}
        onPress={() => router.push(copy.route as any)}
        style={[styles.primaryButton, { flexDirection: rowDirection, backgroundColor: theme.colors.primary }]}
      >
        <Text color={theme.colors.onPrimary} weight="700">{copy.cta}</Text>
        <Ionicons name={arrowForward as any} size={16} color={theme.colors.onPrimary} />
      </TouchableOpacity>
    </Card>
  );
}

function PatientHomeDiscoverySurface({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isRtl, rowDirection, arrowForward } = useAppDirection();

  return (
    <Card variant="outlined" padding="lg" style={[styles.discoverySurface, { borderColor: theme.colors.borderLight }]}>
      <View style={[styles.discoveryIcon, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name="search-outline" size={22} color={theme.colors.primary} />
      </View>
      <Text variant="h2" weight="700" style={[styles.discoveryTitle, { textAlign: isRtl ? "right" : "left" }]}>
        {t("home.discovery.title")}
      </Text>
      <Text color={theme.colors.textSecondary} style={[styles.discoveryBody, { textAlign: isRtl ? "right" : "left" }]}>
        {t("home.discovery.body")}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("home.discovery.cta")}
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.primaryButton, { flexDirection: rowDirection, backgroundColor: theme.colors.primary }]}
      >
        <Text color={theme.colors.onPrimary} weight="700">{t("home.discovery.cta")}</Text>
        <Ionicons name={arrowForward as any} size={16} color={theme.colors.onPrimary} />
      </TouchableOpacity>
    </Card>
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
  primarySurface: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  primaryHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  primaryHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  primaryName: {
    fontSize: 19,
    lineHeight: 25,
  },
  primaryDetails: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryStatus: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  discoverySurface: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  discoveryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryTitle: {
    fontSize: 17,
    lineHeight: 23,
    marginTop: 14,
  },
  discoveryBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
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
