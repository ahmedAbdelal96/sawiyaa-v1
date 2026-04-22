import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
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
} from "../../src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { usePatientJourney } from "../../src/features/patient/journey/hooks";
import { formatLocalizedDateTime } from "../../src/features/patient/sessions/slot-utils";

export default function PatientHomeScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const journeyQuery = usePatientJourney();
  const upcoming = journeyQuery.data?.upcoming;
  const upcomingSession = upcoming?.session;
  const pendingPayment = upcoming?.pendingPayment;
  const hasOpenSupportTicket = journeyQuery.data?.support?.hasOpenTicket;

  return (
    <Screen bg="background">
      <Header
        title="Clinical Sanctuary"
        rightElement={
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.colors.textPrimary}
          />
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

        <Card
          variant="elevated"
          style={[
            styles.nextSessionCard,
            {
              borderRightColor: theme.colors.primary,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          {upcomingSession ? (
            <>
              <View style={styles.nextSessionTopRow}>
                <View
                  style={[
                    styles.badgePill,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Text
                    color={theme.colors.primary}
                    weight="600"
                    style={styles.badgeText}
                  >
                    {t("home.nextSession.badge", "Confirmed")}
                  </Text>
                </View>
                <View style={styles.nextSessionInfo}>
                  <Text weight="bold" style={styles.nextSessionTitle}>
                    {t("home.nextSession.title", "Your next session")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={styles.nextSessionSubtitle}
                  >
                    {upcomingSession.scheduledStartAt
                      ? formatLocalizedDateTime(
                          upcomingSession.scheduledStartAt,
                          locale,
                        )
                      : t(
                          "home.nextSession.subtitle",
                          "Join when your appointment starts",
                        )}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.practitionerStrip,
                  {
                    backgroundColor: theme.colors.surfaceTertiary,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <View style={styles.practitionerTextCol}>
                  <Text weight="600" style={styles.practitionerName}>
                    {upcomingSession.practitioner.displayName ??
                      t(
                        "home.nextSession.defaultDoctor",
                        "Dr. Assigned Therapist",
                      )}
                  </Text>
                </View>
                <View
                  style={[
                    styles.practitionerAvatar,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={24}
                    color={theme.colors.textMuted}
                  />
                </View>
              </View>

              <Button
                title={t("home.nextSession.joinNow", "Join now")}
                onPress={() =>
                  router.push(
                    `/(patient)/sessions/${upcomingSession.id}` as any,
                  )
                }
                style={styles.joinButton}
              />
            </>
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
        </Card>

        <Section title={t("home.quickActions.title", "Quick actions")}>
          <View style={styles.quickActionsGrid}>
            <TouchableQuickAction
              icon="search"
              label={t("home.quickActions.findTherapist", "Find therapist")}
              onPress={() => router.push("/(patient)/discovery" as any)}
            />
            <TouchableQuickAction
              icon="clipboard-outline"
              label={t("home.quickActions.assessments", "Assessments")}
              onPress={() => router.push("/(patient)/assessments" as any)}
            />
            <TouchableQuickAction
              icon="help-circle-outline"
              label={t("home.quickActions.support", "Support")}
              onPress={() => router.push("/(patient)/support" as any)}
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
  nextSessionCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRightWidth: 4,
    paddingTop: 18,
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
