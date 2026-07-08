import React, { useMemo, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Header,
  Screen,
  Text,
  Card,
  Button,
  LoadingState,
  ErrorState,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { getAppDirection } from "../../../src/i18n/direction";
import {
  usePatientSession,
  useResolvePatientSessionJoinContract,
} from "../../../src/features/patient/sessions/hooks";
import type {
  SessionPresentationStatus,
} from "../../../src/features/patient/sessions/types";
import {
  formatLocalizedDateTime,
  formatLocalizedDate,
  formatLocalizedTime,
} from "../../../src/features/patient/sessions/slot-utils";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { openSessionGeneralChat } from "../../../src/features/messages/api";

export default function SessionDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const isRtl = direction === "rtl";
  const locale = isRtl ? "ar-SA" : "en-US";
  const params = useLocalSearchParams<{ id: string }>();

  const sessionQuery = usePatientSession(params.id ?? null);
  const joinMutation = useResolvePatientSessionJoinContract();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isOpeningMessages, setIsOpeningMessages] = useState(false);

  const canAttemptJoin = useMemo(
    () => sessionQuery.data?.joinAvailability?.canJoin === true,
    [sessionQuery.data?.joinAvailability?.canJoin],
  );

  if (sessionQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header showBack />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <Screen bg="background">
        <Header showBack />
        <ErrorState fullScreen onRetry={sessionQuery.refetch} />
      </Screen>
    );
  }

  const session = sessionQuery.data;
  const presentationStatus = session.presentationStatus;
  const presentationStatusText = formatPresentationStatusLabel(t, presentationStatus);
  const needsPayment = session.status === "PENDING_PAYMENT";
  const cancellationEligible =
    session.status === "CONFIRMED" ||
    session.status === "UPCOMING" ||
    session.status === "PENDING_PRACTITIONER_RESPONSE";
  const canOpenMessages = Boolean(
    session.practitioner?.slug && session.chatAvailability?.canRead === true,
  );
  const showJoinBlockedReason =
    Boolean(
      !canAttemptJoin &&
        (presentationStatus === "JOINABLE" ||
          presentationStatus === "IN_PROGRESS") &&
        session.joinAvailability.blockedReason,
    );
  const joinBlockedReasonText = showJoinBlockedReason
    ? t(
        `patientSessionsFlow.detail.blocked.${session.joinAvailability.blockedReason}` as const,
      )
    : null;
  const joinAvailableAtText =
    !canAttemptJoin && session.joinAvailability.availableAt
      ? t("patientSessionsFlow.detail.joinAvailableAt", {
          datetime: formatLocalizedDateTime(session.joinAvailability.availableAt, locale),
        })
      : null;
  const actionStateText = getActionStateText(
    t,
    presentationStatus,
    canAttemptJoin,
    joinAvailableAtText,
    joinBlockedReasonText,
  );
  const messagesHelperText =
    session.chatAvailability.readOnly
      ? t("patientSessionsFlow.detail.messagesReadOnly")
      : t("patientSessionsFlow.detail.actionSummary.messages");
  const roomClosedHelpVisible =
    session.joinAvailability.blockedReason === "SESSION_ROOM_CLOSED";
  const roomClosedSupportSubject = t(
    "patientSessionsFlow.detail.roomClosed.supportSubject",
    {
      sessionCode: session.sessionCode,
    },
  );
  const roomClosedSupportMessage = t(
    "patientSessionsFlow.detail.roomClosed.supportMessage",
    {
      sessionCode: session.sessionCode,
      practitionerName:
        session.practitioner?.displayName ??
        t("patientSessionsFlow.common.practitionerFallback"),
    },
  );

  const handleJoin = async () => {
    setJoinError(null);

    try {
      const payload = await joinMutation.mutateAsync(session.id);
      const contract = payload.item;

      if (!contract.canJoin || !contract.roomUrl) {
        setJoinError(
          t("patientSessionsFlow.detail.joinBlocked", {
            reason: t(
              `patientSessionsFlow.detail.joinBlockedReasons.${
                contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"
              }` as const,
            ),
          }),
        );
        return;
      }

      const joinUrl =
        contract.joinToken && contract.provider === "DAILY"
          ? `${contract.roomUrl}${contract.roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(contract.joinToken)}`
          : contract.roomUrl;

      const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
      if (!safeJoinUrl) {
        setJoinError(t("patientSessionsFlow.detail.joinError"));
        return;
      }

      await Linking.openURL(safeJoinUrl);
      trackAnalyticsEvent("session_joined", {
        role: "patient",
        sessionId: session.id,
        sessionStatus: session.presentationStatus,
        provider: contract.provider,
        source: "session_detail",
      });
    } catch (error) {
      setJoinError(extractApiErrorMessage(error));
    }
  };

  const handleOpenMessages = async () => {
    if (!canOpenMessages) {
      return;
    }

    setMessagesError(null);
    setIsOpeningMessages(true);

    try {
      const payload = await openSessionGeneralChat(session.id);
      router.push(`/(patient)/messages/${payload.item.conversationId}` as any);
    } catch (error) {
      setMessagesError(extractApiErrorMessage(error));
    } finally {
      setIsOpeningMessages(false);
    }
  };

  const showPaymentSection = needsPayment || cancellationEligible;

  return (
    <Screen bg="background">
      <Header showBack title={t("patientSessionsFlow.detail.title")} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          variant="elevated"
          padding="md"
          style={[
            styles.summaryCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : { borderRightColor: theme.colors.primary },
          ]}
        >
          <View style={[styles.summaryHeader, directionRowStyle(direction)]}>
            <View style={styles.summaryTitleWrap}>
              <Text color={theme.colors.textMuted} style={styles.summaryEyebrow}>
                {t("patientSessionsFlow.detail.summary")}
              </Text>
              <Text weight="bold" style={styles.summaryName}>
                {session.practitioner.displayName ??
                  t("patientSessionsFlow.common.practitionerFallback")}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.summaryMeta}>
                {t("patientSessionsFlow.detail.sessionAt", {
                  datetime: session.scheduledStartAt
                    ? formatLocalizedDateTime(session.scheduledStartAt, locale)
                    : t("patientSessionsFlow.common.notAvailable"),
                })}
              </Text>
            </View>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Text color={theme.colors.primary} weight="600">
                {presentationStatusText}
              </Text>
            </View>
          </View>

          <View style={styles.summaryStack}>
            <Text color={theme.colors.textSecondary} style={styles.summaryMeta}>
              {t("patientSessionsFlow.detail.heroMode", {
                mode: formatModeLabel(t, session.sessionMode),
              })}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.summaryMeta}>
              {t("patientSessionsFlow.common.duration")}:{" "}
              {t("patientSessionsFlow.detail.durationValue", {
                minutes: session.durationMinutes,
              })}
            </Text>
            <Text color={theme.colors.textMuted} style={styles.codeText}>
              {t("patientSessionsFlow.detail.sessionCodeLabel", {
                sessionCode: session.sessionCode,
              })}
            </Text>
          </View>
        </Card>

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <View style={[styles.sectionHeader, directionRowStyle(direction)]}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.detail.actionsTitle")}
            </Text>
          </View>

          <Text color={theme.colors.textSecondary} style={styles.sectionBody}>
            {actionStateText}
          </Text>

          {canAttemptJoin ? (
            <Button
              title={
                joinMutation.isPending
                  ? t("patientSessionsFlow.detail.joining")
                  : t("patientSessionsFlow.detail.join")
              }
              onPress={handleJoin}
              loading={joinMutation.isPending}
              style={styles.primaryAction}
            />
          ) : null}

          {!canAttemptJoin && joinAvailableAtText ? (
            <Text color={theme.colors.textSecondary} style={styles.joinHint}>
              {joinAvailableAtText}
            </Text>
          ) : null}

          {roomClosedHelpVisible ? (
            <Card variant="flat" padding="md" style={styles.roomClosedCard}>
              <View style={[styles.roomClosedHeader, directionRowStyle(direction)]}>
                <View
                  style={[
                    styles.roomClosedIcon,
                    { backgroundColor: theme.colors.warningLight },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={theme.colors.warning}
                  />
                </View>
                <View style={styles.roomClosedCopy}>
                  <Text
                    weight="700"
                    style={[
                      styles.roomClosedTitle,
                      { textAlign: isRtl ? "right" : "left" },
                    ]}
                  >
                    {t("patientSessionsFlow.detail.roomClosed.title")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={[
                      styles.roomClosedBody,
                      { textAlign: isRtl ? "right" : "left" },
                    ]}
                  >
                    {t("patientSessionsFlow.detail.roomClosed.body")}
                  </Text>
                </View>
              </View>

              <Button
                title={t("patientSessionsFlow.detail.roomClosed.cta")}
                onPress={() => {
                  router.push({
                    pathname: "/(patient)/support/new",
                    params: {
                      returnTo: `/(patient)/sessions/${session.id}`,
                      relatedSessionId: session.id,
                      category: "SESSION",
                      subject: roomClosedSupportSubject,
                      message: roomClosedSupportMessage,
                      sessionCode: session.sessionCode,
                    },
                  } as any);
                }}
                style={styles.roomClosedButton}
              />
            </Card>
          ) : null}

          {canOpenMessages ? (
            <SecondaryActionRow
              label={t("patientSessionsFlow.detail.messages")}
              helperText={messagesHelperText}
              onPress={() => void handleOpenMessages()}
              loading={isOpeningMessages}
              disabled={isOpeningMessages}
              direction={direction}
              theme={theme}
            />
          ) : null}

          {messagesError ? (
            <Text color="#ba1a1a" style={styles.errorText}>
              {messagesError}
            </Text>
          ) : null}
        </Card>

        {showPaymentSection ? (
          <Card variant="flat" padding="md" style={styles.sectionCard}>
            <View style={[styles.sectionHeader, directionRowStyle(direction)]}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("patientSessionsFlow.detail.paymentSectionTitle")}
              </Text>
            </View>

            {needsPayment ? (
              <Button
                title={t("patientSessionsFlow.detail.payNow")}
                onPress={() => {
                  router.push(`/(patient)/sessions/${session.id}/pay`);
                }}
                style={styles.primaryAction}
              />
            ) : null}

            {cancellationEligible ? (
              <Button
                title={t("patientSessionsFlow.detail.viewCancellation")}
                onPress={() =>
                  router.push(`/(patient)/sessions/${session.id}/cancel-preview`)
                }
                variant="secondary"
                style={styles.secondaryButton}
              />
            ) : null}
          </Card>
        ) : null}

        <Card variant="flat" padding="md" style={styles.sectionCard}>
          <View style={[styles.sectionHeader, directionRowStyle(direction)]}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientSessionsFlow.detail.sessionFacts")}
            </Text>
          </View>

          <DetailRow
            direction={direction}
            theme={theme}
            icon="calendar-outline"
            label={t("patientSessionsFlow.detail.dateLabel")}
            value={
              session.scheduledStartAt
                ? formatLocalizedDate(session.scheduledStartAt, locale)
                : t("patientSessionsFlow.common.notAvailable")
            }
          />

          <DetailRow
            direction={direction}
            theme={theme}
            icon="time-outline"
            label={t("patientSessionsFlow.detail.timeLabel")}
            value={
              session.scheduledStartAt && session.scheduledEndAt
                ? `${formatLocalizedTime(session.scheduledStartAt, locale)} \u2013 ${formatLocalizedTime(session.scheduledEndAt, locale)}`
                : session.scheduledStartAt
                  ? formatLocalizedTime(session.scheduledStartAt, locale)
                  : t("patientSessionsFlow.common.notAvailable")
            }
          />

          <DetailRow
            direction={direction}
            theme={theme}
            icon="hourglass-outline"
            label={t("patientSessionsFlow.detail.duration")}
            value={t("patientSessionsFlow.detail.durationValue", {
              minutes: session.durationMinutes,
            })}
          />

          <DetailRow
            direction={direction}
            theme={theme}
            icon="repeat-outline"
            label={t("patientSessionsFlow.detail.flowType")}
            value={formatFlowTypeLabel(t, session.flowType)}
          />

          <DetailRow
            direction={direction}
            theme={theme}
            icon="globe-outline"
            label={t("patientSessionsFlow.detail.timezone")}
            value={
              session.timezone
                ? t("patientSessionsFlow.detail.timezoneValue", {
                    city: session.timezone,
                  })
                : t("patientSessionsFlow.common.notAvailable")
            }
          />

          {session.expiresAt ? (
            <DetailRow
              direction={direction}
              theme={theme}
              icon="hourglass-outline"
              label={t("patientSessionsFlow.detail.expiresAt")}
              value={formatLocalizedDateTime(session.expiresAt, locale)}
            />
          ) : null}

          {session.presentationStatus === "CANCELLED" &&
          session.cancellationReason ? (
            <DetailRow
              direction={direction}
              theme={theme}
              icon="information-circle-outline"
              label={t("patientSessionsFlow.detail.cancellationReasonLabel")}
              value={session.cancellationReason}
            />
          ) : null}
        </Card>

        {joinError ? (
          <Card variant="flat" padding="sm">
            <Text color="#ba1a1a">{joinError}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function formatPresentationStatusLabel(
  t: ReturnType<typeof useTranslation>["t"],
  status: SessionPresentationStatus,
) {
  const map: Record<SessionPresentationStatus, string> = {
    UPCOMING: t("patientSessionsFlow.presentationStatus.UPCOMING"),
    JOINABLE: t("patientSessionsFlow.presentationStatus.JOINABLE"),
    IN_PROGRESS: t("patientSessionsFlow.presentationStatus.IN_PROGRESS"),
    COMPLETED: t("patientSessionsFlow.presentationStatus.COMPLETED"),
    CANCELLED: t("patientSessionsFlow.presentationStatus.CANCELLED"),
    ENDED: t("patientSessionsFlow.presentationStatus.ENDED"),
    UNAVAILABLE: t("patientSessionsFlow.presentationStatus.UNAVAILABLE"),
    NO_SHOW: t("patientSessionsFlow.presentationStatus.NO_SHOW"),
    UNDER_REVIEW: t("patientSessionsFlow.presentationStatus.UNDER_REVIEW"),
  };

  return map[status] ?? status;
}

function formatModeLabel(
  t: ReturnType<typeof useTranslation>["t"],
  mode: string,
) {
  switch (mode) {
    case "VIDEO":
      return t("patientSessionsFlow.detail.modeValue.VIDEO");
    case "AUDIO":
      return t("patientSessionsFlow.detail.modeValue.AUDIO");
    case "CHAT":
      return t("patientSessionsFlow.detail.modeValue.CHAT");
    default:
      return mode;
  }
}

function formatFlowTypeLabel(
  t: ReturnType<typeof useTranslation>["t"],
  flowType: string,
) {
  switch (flowType) {
    case "SCHEDULED":
      return t("patientSessionsFlow.detail.flowTypeValue.SCHEDULED");
    case "INSTANT":
      return t("patientSessionsFlow.detail.flowTypeValue.INSTANT");
    case "DEFAULT":
      return t("patientSessionsFlow.detail.flowTypeValue.DEFAULT");
    default:
      return flowType;
  }
}

function getActionStateText(
  t: ReturnType<typeof useTranslation>["t"],
  presentationStatus: SessionPresentationStatus,
  canAttemptJoin: boolean,
  joinAvailableAtText: string | null,
  joinBlockedReasonText: string | null,
) {
  switch (presentationStatus) {
    case "JOINABLE":
      return canAttemptJoin
        ? t("patientSessionsFlow.detail.stateNote.READY_TO_JOIN_NOW")
        : joinBlockedReasonText ??
            joinAvailableAtText ??
            t("patientSessionsFlow.detail.noImmediateAction");
    case "IN_PROGRESS":
      return canAttemptJoin
        ? t("patientSessionsFlow.detail.stateNote.IN_PROGRESS")
        : joinBlockedReasonText ??
            joinAvailableAtText ??
            t("patientSessionsFlow.detail.noImmediateAction");
    case "COMPLETED":
    case "ENDED":
    case "NO_SHOW":
    case "UNDER_REVIEW":
      return t("patientSessionsFlow.detail.noImmediateAction");
    case "CANCELLED":
      return t("patientSessionsFlow.detail.stateNote.CANCELLED");
    case "UPCOMING":
      return joinAvailableAtText ?? t("patientSessionsFlow.detail.stateNote.UPCOMING");
    case "UNAVAILABLE":
    default:
      return t("patientSessionsFlow.detail.stateNote.UNAVAILABLE");
  }
}

function directionRowStyle(direction: "rtl" | "ltr") {
  return { flexDirection: direction === "rtl" ? "row-reverse" : "row" } as const;
}

type SecondaryActionRowProps = {
  label: string;
  helperText?: string | null;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  direction: "rtl" | "ltr";
  theme: ReturnType<typeof useTheme>["theme"];
};

function SecondaryActionRow({
  label,
  helperText,
  onPress,
  loading = false,
  disabled = false,
  direction,
  theme,
}: SecondaryActionRowProps) {
  const isRTL = direction === "rtl";

  return (
    <View style={styles.secondaryActionWrap}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        disabled={disabled}
        accessibilityRole="button"
        style={[
          styles.secondaryActionRow,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            borderColor: theme.colors.borderLight,
            backgroundColor: theme.colors.surface,
            opacity: disabled ? 0.7 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.secondaryActionIcon,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.secondaryActionTextWrap}>
          <View
            style={[
              styles.secondaryActionHeadlineRow,
              directionRowStyle(direction),
            ]}
          >
            <Text weight="600" style={styles.secondaryActionTitle}>
              {loading ? `${label}...` : label}
            </Text>
          </View>

          {helperText ? (
            <Text color={theme.colors.textSecondary} style={styles.secondaryActionHelper}>
              {helperText}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name={isRTL ? "chevron-back" : "chevron-forward"}
          size={18}
          color={theme.colors.textMuted}
          style={styles.secondaryActionChevron}
        />
      </TouchableOpacity>
    </View>
  );
}

type DetailRowProps = {
  direction: "rtl" | "ltr";
  theme: ReturnType<typeof useTheme>["theme"];
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function DetailRow({ direction, theme, icon, label, value }: DetailRowProps) {
  const isRTL = direction === "rtl";

  return (
    <View
      style={[
        styles.detailRow,
        {
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View
        style={[
          styles.detailIconWrap,
          { backgroundColor: theme.colors.primaryLight },
        ]}
      >
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
      </View>

      <View style={styles.detailTextWrap}>
        <Text color={theme.colors.textMuted} style={styles.detailLabel}>
          {label}
        </Text>
        <Text weight="600" style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  summaryCard: {
    borderRightWidth: 3,
    borderRightColor: "#3f7dcf",
  },
  summaryHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTitleWrap: {
    flex: 1,
    gap: 4,
  },
  summaryEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  summaryName: {
    fontSize: 22,
    lineHeight: 28,
  },
  summaryMeta: {
    fontSize: 13,
    lineHeight: 20,
  },
  summaryStack: {
    marginTop: 14,
    gap: 4,
  },
  codeText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#e7ecf2",
    gap: 10,
  },
  sectionHeader: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  primaryAction: {
    borderRadius: 14,
    marginTop: 2,
  },
  secondaryButton: {
    borderRadius: 14,
    marginTop: 4,
  },
  joinHint: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: -2,
  },
  roomClosedCard: {
    gap: 12,
    marginTop: 4,
  },
  roomClosedHeader: {
    alignItems: "flex-start",
    gap: 10,
  },
  roomClosedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  roomClosedCopy: {
    flex: 1,
    gap: 4,
  },
  roomClosedTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  roomClosedBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  roomClosedButton: {
    marginTop: 4,
  },
  secondaryActionWrap: {
    marginTop: 2,
  },
  secondaryActionRow: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 12,
  },
  secondaryActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  secondaryActionTextWrap: {
    flex: 1,
    gap: 2,
  },
  secondaryActionHeadlineRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryActionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  secondaryActionHelper: {
    fontSize: 12,
    lineHeight: 18,
  },
  secondaryActionChevron: {
    flexShrink: 0,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
  },
  detailRow: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailTextWrap: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
  },
});
