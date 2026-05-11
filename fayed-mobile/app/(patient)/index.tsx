import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  Screen,
  Text,
  Card,
  Button,
  Section,
  Header,
  ErrorState,
  LoadingState,
  CompactActionRow,
  StatusChip,
} from "../../src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { usePatientJourney } from "../../src/features/patient/journey/hooks";
import type {
  PatientJourneyNextStepDto,
  PatientJourneyResponseDto,
} from "../../src/features/patient/journey/types";
import { formatLocalizedDateTime } from "../../src/features/patient/sessions/slot-utils";
import { usePatientUnreadNotificationCount } from "../../src/features/patient/notifications/hooks";

export default function PatientHomeScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const journeyQuery = usePatientJourney();
  const unreadNotificationsQuery = usePatientUnreadNotificationCount();
  const upcoming = journeyQuery.data?.upcoming;
  const upcomingSession = upcoming?.session;
  const pendingPayment = upcoming?.pendingPayment;
  const hasOpenSupportTicket = journeyQuery.data?.support?.hasOpenTicket;
  const unreadNotificationCount =
    unreadNotificationsQuery.data?.item.unreadCount ?? 0;
  const nextStep = resolveNextStep(journeyQuery.data);
  const nextStepRoute = nextStep
    ? resolveNextStepRoute(journeyQuery.data, nextStep)
    : null;
  const journeyStateCard = journeyQuery.isLoading
    ? "loading"
    : journeyQuery.isError
    ? "error"
      : "ready";
  const upcomingSessionTone = mapUpcomingSessionTone(upcomingSession?.status);
  const upcomingSessionActionLabel =
    upcomingSession &&
    isJoinableSessionStatus(upcomingSession.status)
      ? "Join"
      : "View";
  const upcomingSessionRoute = upcomingSession
    ? `/(patient)/sessions/${upcomingSession.id}`
    : null;

  return (
    <Screen bg="background">
      <Header
        title="Clinical Sanctuary"
        rightElement={
          <TouchableOpacity
            onPress={() => router.push("/(patient)/notifications" as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.notificationsButton}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.colors.textPrimary}
            />
            {unreadNotificationCount > 0 ? (
              <View
                style={[
                  styles.notificationBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  color="#fff"
                  weight="600"
                  style={styles.notificationBadgeText}
                >
                  {unreadNotificationCount > 99
                    ? "99+"
                    : String(unreadNotificationCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.greetingRow}>
          <View style={styles.greeting}>
            <Text
              color={theme.colors.textSecondary}
              style={styles.greetingEyebrow}
            >
              {t("welcome", "Welcome back")}
            </Text>
            <Text weight="bold" style={styles.greetingTitle}>
              {
                (user?.displayName ?? user?.primaryEmail ?? "User").split(
                  " ",
                )[0]
              }
            </Text>
          </View>
          <View
            style={[styles.userChip, { backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="person" size={22} color={theme.colors.primary} />
          </View>
        </View>

        {upcomingSession ? (
          <Card
            variant="outlined"
            padding="md"
            style={[
              styles.upcomingSessionCard,
              {
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <View style={styles.upcomingSessionHeader}>
              <View style={styles.upcomingSessionHeaderText}>
                <Text weight="bold" style={styles.upcomingSessionTitle}>
                  {t("home.upcomingSession.title", "Upcoming Session")}
                </Text>
                <Text color={theme.colors.textSecondary} style={styles.upcomingSessionName}>
                  {upcomingSession.practitioner.displayName ??
                    t("home.nextSession.defaultDoctor", "Dr. Assigned Therapist")}
                </Text>
              </View>
              <StatusChip
                label={t(`sessionStatus.${upcomingSession.status}`)}
                tone={upcomingSessionTone}
                showDot={false}
              />
            </View>

            <Text color={theme.colors.textSecondary} style={styles.upcomingSessionTime}>
              {upcomingSession.scheduledStartAt
                ? formatLocalizedDateTime(upcomingSession.scheduledStartAt, locale)
                : t("home.nextSession.subtitle", "Join when your appointment starts")}
            </Text>

            <CompactActionRow
              label={upcomingSessionActionLabel}
              onPress={() => router.push(upcomingSessionRoute as any)}
              accessibilityLabel={upcomingSessionActionLabel}
            />
          </Card>
        ) : pendingPayment ? (
            <>
              <View style={styles.nextSessionTopRow}>
                <View
                  style={[
                    styles.badgePill,
                    { backgroundColor: theme.colors.warning + "20" },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.warning ?? "#f59e0b",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {t("home.journey.pendingPayment")}
                  </Text>
                </View>
                <View style={styles.nextSessionInfo}>
                  <Text weight="bold" style={styles.nextSessionTitle}>
                    {t("home.journey.completePaymentTitle")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.nextSessionSubtitle}
                  >
                    {t("home.journey.completePaymentSubtitle")}
                  </Text>
                </View>
              </View>
              <Button
                title={t("home.journey.payNow")}
                onPress={() =>
                  pendingPayment.sessionId
                    ? router.push(
                        `/(patient)/sessions/${pendingPayment.sessionId}/pay` as any,
                      )
                    : router.push("/(patient)/sessions" as any)
                }
                style={styles.joinButton}
              />
            </>
          ) : (
            <>
              <View style={styles.nextSessionTopRow}>
                <View style={styles.nextSessionInfo}>
                  <Text weight="bold" style={styles.nextSessionTitle}>
                    {t("home.nextSession.title", "Your next session")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.nextSessionSubtitle}
                  >
                    {t(
                      "home.nextSession.subtitle",
                      "Join when your appointment starts",
        )}
                  </Text>
                </View>
              </View>
              <Button
                title={t("home.nextSession.joinNow", "Join now")}
                onPress={() => router.push("/(patient)/sessions")}
                style={styles.joinButton}
              />
            </>
          )}
        {journeyStateCard === "loading" ? (
          <Card
            variant="outlined"
            padding="lg"
            style={[
              styles.nextStepCard,
              {
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <LoadingState message="Loading your next step..." />
          </Card>
        ) : journeyStateCard === "error" ? (
          <Card
            variant="outlined"
            padding="lg"
            style={[
              styles.nextStepCard,
              {
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <ErrorState
              title="Could not load your next step"
              message="Please try again in a moment."
              onRetry={() => journeyQuery.refetch()}
              retryText="Try again"
            />
          </Card>
        ) : nextStep && nextStepRoute ? (
          <Card
            variant="outlined"
            padding="md"
            style={[
              styles.nextStepCard,
              {
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <View style={styles.nextStepTopRow}>
              <StatusChip label="Next step" tone="info" />
              <Text color={theme.colors.textMuted} style={styles.nextStepMeta}>
                {nextStep.type.replaceAll("_", " ")}
              </Text>
            </View>

            <Text weight="bold" style={styles.nextStepTitle}>
              {nextStep.label}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.nextStepBody}>
              {nextStep.reasonText}
            </Text>

            <CompactActionRow
              label={nextStep.action.label}
              onPress={() => router.push(nextStepRoute as any)}
              accessibilityLabel={nextStep.action.label}
              style={styles.nextStepCta}
            />
          </Card>
        ) : null}

        <Section title={t("home.quickActions.title", "Quick actions")}>
          <View style={styles.quickActionsGrid}>
            <TouchableQuickAction
              icon="search"
              label={t("home.quickActions.findTherapist", "Find therapist")}
              onPress={() => router.push("/(patient)/discovery" as any)}
            />
            <TouchableQuickAction
              icon="school-outline"
              label={t("home.quickActions.academy", "Academy")}
              onPress={() => router.push("/(patient)/academy" as any)}
            />
            <TouchableQuickAction
              icon="newspaper-outline"
              label="Articles"
              onPress={() => router.push("/(patient)/articles" as any)}
            />
            <TouchableQuickAction
              icon="clipboard-outline"
              label={t("home.quickActions.assessments", "Assessments")}
              onPress={() => router.push("/(patient)/assessments" as any)}
            />
            <TouchableQuickAction
              icon="help-circle-outline"
              label={t("home.quickActions.support", "Support")}
              onPress={() =>
                router.push(
                  {
                    pathname: "/(patient)/support",
                    params: { returnTo: pathname },
                  } as any,
                )
              }
              badge={hasOpenSupportTicket ? 1 : 0}
            />
            <TouchableQuickAction
              icon="chatbubble-ellipses-outline"
              label={t("home.quickActions.careChat", "Care Chat")}
              onPress={() => router.push("/(patient)/care-chat" as any)}
            />
          </View>
        </Section>

        <Section title="Find Your Match">
          <Card
            variant="elevated"
            style={[
              styles.matchingCard,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.colors.borderLight,
              },
            ]}
            onPress={() => router.push("/(patient)/matching/intro")}
          >
            <View style={styles.matchingCardContent}>
              <Text weight="bold" style={styles.matchingTitle}>
                Guided Matching
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.matchingDesc}
              >
                Answer a few questions and we'll match you with the right
                therapist.
              </Text>
              <Button
                title="Start Match"
                onPress={() => router.push("/(patient)/matching/intro")}
                style={styles.matchingButton}
              />
            </View>
          </Card>
        </Section>

        <Section title="Upcoming Sessions">
          <Card
            padding="lg"
            variant="elevated"
            style={{ borderWidth: 1, borderColor: theme.colors.borderLight }}
          >
            <View style={styles.emptySession}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={theme.colors.textMuted}
              />
              <Text weight="600" style={styles.emptySessionTitle}>
                No upcoming sessions
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.emptySessionSubtitle}
              >
                Book a session to get started on your journey.
              </Text>
              <Button
                title="Find a Therapist"
                onPress={() => router.push("/(patient)/discovery")}
                style={{ marginTop: 4 }}
              />
            </View>
          </Card>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function TouchableQuickAction({
  icon,
  label,
  onPress,
  badge = 0,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  const { theme } = useTheme();

  return (
    <Card
      variant="elevated"
      padding="md"
      onPress={onPress}
      style={styles.quickActionCard}
    >
      <View style={styles.quickActionIconWrap}>
        <View
          style={[
            styles.quickActionIconCircle,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        {badge > 0 ? (
          <View
            style={[
              styles.badgeCircle,
              { backgroundColor: theme.colors.error },
            ]}
          />
        ) : null}
      </View>
      <Text weight="600" style={styles.quickActionLabel}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
  },
  greetingRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    flex: 1,
    marginRight: 14,
  },
  greetingEyebrow: {
    fontSize: 13,
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 36,
    lineHeight: 42,
  },
  userChip: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d9e2f0",
  },
  notificationsButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
  },
  nextSessionCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRightWidth: 4,
    paddingTop: 18,
  },
  nextStepCard: {
    marginHorizontal: 20,
    marginBottom: 18,
  },
  upcomingSessionCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    gap: 14,
  },
  upcomingSessionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  upcomingSessionHeaderText: {
    flex: 1,
  },
  upcomingSessionTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  upcomingSessionName: {
    fontSize: 14,
    lineHeight: 20,
  },
  upcomingSessionTime: {
    fontSize: 14,
    lineHeight: 22,
  },
  nextStepTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  nextStepMeta: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  nextStepTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  nextStepBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  nextStepCta: {
    marginTop: 14,
  },
  nextSessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  badgePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  badgeText: {
    fontSize: 12,
  },
  nextSessionInfo: {
    flex: 1,
  },
  nextSessionTitle: {
    fontSize: 28,
    marginBottom: 2,
  },
  nextSessionSubtitle: {
    fontSize: 14,
  },
  practitionerStrip: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  practitionerTextCol: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 22,
    marginBottom: 2,
  },
  practitionerSpecialty: {
    fontSize: 15,
  },
  practitionerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#d9e2f0",
  },
  joinButton: {
    minHeight: 48,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickActionCard: {
    width: "48.5%",
    minHeight: 108,
    justifyContent: "center",
  },
  quickActionIconWrap: {
    marginBottom: 12,
    position: "relative",
    alignSelf: "flex-start",
  },
  quickActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCircle: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  quickActionLabel: {
    fontSize: 15,
  },
  matchingCard: {
    borderWidth: 1,
  },
  matchingCardContent: {
    padding: 4,
  },
  matchingTitle: {
    fontSize: 26,
    marginBottom: 8,
  },
  matchingDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  matchingButton: {
    minWidth: 168,
    alignSelf: "flex-start",
  },
  emptySession: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  emptySessionTitle: {
    fontSize: 19,
    marginTop: 6,
  },
  emptySessionSubtitle: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },
});

function resolveNextStep(journey?: PatientJourneyResponseDto | null) {
  if (!journey) {
    return null;
  }

  const nextSteps = Array.isArray(journey.nextSteps) ? journey.nextSteps : [];
  const suggestedAction = journey.summary?.suggestedNextAction;

  if (suggestedAction) {
    return (
      nextSteps.find((step) => step.type === suggestedAction) ??
      nextSteps[0] ??
      null
    );
  }

  return nextSteps[0] ?? null;
}

function resolveNextStepRoute(
  journey: PatientJourneyResponseDto | undefined | null,
  step: PatientJourneyNextStepDto,
) {
  const route = step.action.route?.trim();

  if (route) {
    return normalizePatientRoute(route);
  }

  switch (step.type) {
    case "COMPLETE_PAYMENT":
      return journey?.upcoming.pendingPayment?.sessionId
        ? `/(patient)/sessions/${journey.upcoming.pendingPayment.sessionId}/pay`
        : "/(patient)/payments";
    case "JOIN_UPCOMING_SESSION":
      return journey?.upcoming.session?.id
        ? `/(patient)/sessions/${journey.upcoming.session.id}`
        : "/(patient)/sessions";
    case "VIEW_SUPPORT_TICKET":
      return journey?.support.latestOpenTicket?.id
        ? `/(patient)/support/${journey.support.latestOpenTicket.id}`
        : "/(patient)/support";
    case "BOOK_NEXT_SESSION":
      return "/(patient)/discovery";
    case "START_GUIDED_MATCHING":
      return "/(patient)/matching/intro";
    case "TAKE_ASSESSMENT":
      return "/(patient)/assessments";
    default:
      return null;
  }
}

function normalizePatientRoute(route: string) {
  if (route.startsWith("/(patient)")) {
    return route;
  }

  if (route.startsWith("/patient")) {
    return `/(patient)${route.slice("/patient".length)}`;
  }

  return route;
}

function isJoinableSessionStatus(status: string | null | undefined) {
  return status === "READY_TO_JOIN" || status === "IN_PROGRESS";
}

function mapUpcomingSessionTone(status: string | null | undefined) {
  switch (status) {
    case "READY_TO_JOIN":
    case "IN_PROGRESS":
      return "success" as const;
    case "UPCOMING":
    case "CONFIRMED":
      return "warning" as const;
    case "CANCELLED":
    case "NO_SHOW":
    case "EXPIRED":
      return "error" as const;
    default:
      return "default" as const;
  }
}
