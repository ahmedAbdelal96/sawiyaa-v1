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
  Avatar,
  StatusChip,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { getAppDirection, getDirectionalIcon } from "../../../src/i18n/direction";
import {
  usePatientSession,
  useResolvePatientSessionJoinContract,
} from "../../../src/features/patient/sessions/hooks";
import type { SessionStatus } from "../../../src/features/patient/sessions/types";
import {
  formatLocalizedDateTime,
  formatLocalizedDate,
  formatLocalizedTime,
} from "../../../src/features/patient/sessions/slot-utils";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import {
  getSessionGeneralChatConversation,
  openSessionGeneralChat,
} from "../../../src/features/messages/api";
import { operationalCanCancel, operationalJoinAllowed, operationalState } from "../../../src/features/sessions/operational";
import { getTimeZoneDisplayLabel } from "../../../src/features/timezone/timezone-options";

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
    () => sessionQuery.data ? operationalJoinAllowed(sessionQuery.data) : false,
    [sessionQuery.data],
  );

  if (sessionQuery.isLoading) {
    return (
      <Screen bg="background" testID="patient-session-details-screen">
        <Header showBack />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <Screen bg="background" testID="patient-session-details-screen">
        <Header showBack />
        <ErrorState fullScreen onRetry={sessionQuery.refetch} />
      </Screen>
    );
  }

  const session = sessionQuery.data;
  const presentationStatus = operationalState(session) ?? "DRAFT";
  const presentationStatusText = formatPresentationStatusLabel(t, presentationStatus as SessionStatus);
  // Older persisted query data may predate the backend-owned action contract.
  // Missing flags deny actions instead of recreating lifecycle rules on mobile.
  const needsPayment = session.operational?.actions?.canPay === true;
  const cancellationEligible = operationalCanCancel(session);
  const canOpenMessages = Boolean(
    session.practitioner?.slug && session.chatAvailability?.canRead === true,
  );
  const showJoinBlockedReason =
    Boolean(
      !canAttemptJoin &&
        session.operational?.join?.reasonCode,
    );
  const joinBlockedReasonText = showJoinBlockedReason
    ? t(
        `patientSessionsFlow.detail.blocked.${session.operational?.join?.reasonCode}` as const,
      )
    : null;
  const joinAvailableAtText =
    !canAttemptJoin && session.operational?.join?.opensAt
      ? t("patientSessionsFlow.detail.joinAvailableAt", {
          datetime: formatLocalizedDateTime(session.operational.join.opensAt, locale),
        })
      : null;
  const actionStateText = getActionStateText(
    t,
    presentationStatus as SessionStatus,
    canAttemptJoin,
    needsPayment,
    joinAvailableAtText,
    joinBlockedReasonText,
  );
  const messagesHelperText =
    session.chatAvailability?.readOnly
      ? t("patientSessionsFlow.detail.messagesReadOnly")
      : t("patientSessionsFlow.detail.actionSummary.messages");
  const roomClosedHelpVisible =
    session.operational?.room?.state === "CLOSED";
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
        sessionStatus: presentationStatus,
        provider: contract.provider,
        source: "session_detail",
      });
    } catch {
      setJoinError(t("patientSessionsFlow.detail.joinError"));
    }
  };

  const handleOpenMessages = async () => {
    if (!canOpenMessages) {
      return;
    }

    setMessagesError(null);
    setIsOpeningMessages(true);

    try {
      const payload = await getSessionGeneralChatConversation(session.id);
      if (payload.item?.conversationId) {
        router.push(`/(patient)/messages/${payload.item.conversationId}` as any);
      } else if (payload.chatAvailability.canSend) {
        const opened = await openSessionGeneralChat(session.id);
        if (opened.item?.conversationId) {
          router.push(`/(patient)/messages/${opened.item.conversationId}` as any);
        } else {
          setMessagesError(t("patientSessionsFlow.detail.noMessages"));
        }
      } else {
        setMessagesError(t("patientSessionsFlow.detail.noMessages"));
      }
    } catch {
      setMessagesError(t("patientSessionsFlow.detail.openMessagesError"));
    } finally {
      setIsOpeningMessages(false);
    }
  };

  const rowDirection = isRtl ? "row-reverse" : "row";
  const alignSelfStart = isRtl ? "flex-end" : "flex-start";
  const practitionerName =
    session.practitioner.displayName ??
    t("patientSessionsFlow.common.practitionerFallback");

  return (
    <Screen bg="background" testID="patient-session-details-screen">
      <Header showBack title={t("patientSessionsFlow.detail.title")} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Lifecycle Stepper */}
        <SessionProgressStepper status={presentationStatus as SessionStatus} t={t} isRtl={isRtl} />

        {/* Summary Card */}
        <Card
          variant="outlined"
          padding="md"
          style={[
            styles.summaryCard,
            {
              borderColor: "#E8DED0",
              backgroundColor: "#FFFFFF",
            },
          ]}
        >
          <View style={[styles.summaryHeader, { flexDirection: rowDirection, alignItems: "center" }]}>
            <Avatar name={practitionerName} size={56} label={practitionerName} />
            <View style={[styles.summaryTitleWrap, { alignItems: alignSelfStart, flex: 1, paddingHorizontal: 12 }]}>
              <Text color="#6F7E78" style={styles.summaryEyebrow}>
                {t("patientSessionsFlow.detail.summary")}
              </Text>
              <Text weight="700" style={styles.summaryName} color="#1F332F" numberOfLines={1}>
                {practitionerName}
              </Text>
              <Text color="#8F9E98" style={styles.summaryMeta}>
                {t("patientSessionsFlow.detail.sessionAt", {
                  datetime: session.scheduledStartAt
                    ? formatLocalizedDateTime(session.scheduledStartAt, locale)
                    : t("patientSessionsFlow.common.notAvailable"),
                })}
              </Text>
            </View>

            <View style={styles.cardStatusWrap}>
              <StatusChip
                label={presentationStatusText}
                tone={resolveSessionTone(presentationStatus as SessionStatus)}
                showDot={false}
              />
            </View>
          </View>

          <View style={styles.newSummaryDivider} />

          <View style={[styles.summaryStack, { alignItems: alignSelfStart }]}>
            <Text color="#6F7E78" style={styles.summaryMeta}>
              {t("patientSessionsFlow.detail.heroMode", {
                mode: formatModeLabel(t, session.sessionMode),
              })}
            </Text>
            <Text color="#6F7E78" style={styles.summaryMeta}>
              {t("patientSessionsFlow.common.duration")}:{" "}
              {t("patientSessionsFlow.detail.durationValue", {
                minutes: session.durationMinutes,
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
          ) : needsPayment ? (
            <Button
              title={t("patientSessionsFlow.list.actions.completePayment")}
              onPress={() => router.push(`/(patient)/sessions/${session.id}/pay`)}
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
                (session.timezone
                  ? getTimeZoneDisplayLabel(session.timezone, isRtl ? "ar" : "en")
                  : null) ?? t("patientSessionsFlow.common.notAvailable")
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

          {session.operational?.state === "CANCELLED" &&
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
  status: SessionStatus,
) {
  const map: Partial<Record<SessionStatus, string>> = {
    PENDING_PAYMENT: t("patientSessionsFlow.list.status.paymentRequired"),
    PENDING_PRACTITIONER_CONFIRMATION: t("patientSessionsFlow.list.status.underReview"),
    UPCOMING: t("patientSessionsFlow.list.status.upcoming"),
    READY_TO_JOIN: t("patientSessionsFlow.list.status.readyToJoin"),
    IN_PROGRESS: t("patientSessionsFlow.list.status.inProgress"),
    AWAITING_ADMIN_RESOLUTION: t("patientSessionsFlow.list.status.underReview"),
    AWAITING_COMPLETION_CONFIRMATION: t("patientSessionsFlow.list.status.underReview"),
    COMPLETED: t("patientSessionsFlow.list.status.completed"),
    CANCELLED: t("patientSessionsFlow.list.status.cancelled"),
    PATIENT_NO_SHOW: t("patientSessionsFlow.list.status.noShow"),
    PRACTITIONER_NO_SHOW: t("patientSessionsFlow.list.status.noShow"),
    BOTH_NO_SHOW: t("patientSessionsFlow.list.status.noShow"),
    EXPIRED: t("patientSessionsFlow.list.status.unavailable"),
  };

  return map[status] ?? t("patientSessionsFlow.list.status.unavailable");
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
      return t("patientSessionsFlow.detail.modeValue.UNKNOWN");
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
      return t("patientSessionsFlow.detail.flowTypeValue.DEFAULT");
  }
}

function getActionStateText(
  t: ReturnType<typeof useTranslation>["t"],
  presentationStatus: SessionStatus,
  canAttemptJoin: boolean,
  needsPayment: boolean,
  joinAvailableAtText: string | null,
  joinBlockedReasonText: string | null,
) {
  if (needsPayment) {
    return t("patientSessionsFlow.detail.paymentRequiredSummary");
  }

  switch (presentationStatus) {
    case "READY_TO_JOIN":
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
    case "PATIENT_NO_SHOW":
    case "PRACTITIONER_NO_SHOW":
    case "BOTH_NO_SHOW":
    case "AWAITING_COMPLETION_CONFIRMATION":
      return t("patientSessionsFlow.detail.noImmediateAction");
    case "CANCELLED":
      return t("patientSessionsFlow.detail.stateNote.CANCELLED");
    case "UPCOMING":
      return t("patientSessionsFlow.detail.stateNote.UPCOMING");
    case "EXPIRED":
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
          name={getDirectionalIcon("disclosure", isRTL)}
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

function resolveSessionTone(status: string) {
  switch (status) {
    case "READY_TO_JOIN":
    case "IN_PROGRESS":
      return "success" as const;
    case "DRAFT":
    case "PENDING_PRACTITIONER_CONFIRMATION":
    case "PENDING_PAYMENT":
    case "UPCOMING":
      return "warning" as const;
    case "COMPLETED":
      return "default" as const;
    case "CANCELLED":
    case "EXPIRED":
    case "PATIENT_NO_SHOW":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function SessionProgressStepper({
  status,
  t,
  isRtl,
}: {
  status: string;
  t: any;
  isRtl: boolean;
}) {
  const rowDir = isRtl ? "row-reverse" : "row";

  let step1Done = true;
  let step2Active = false;
  let step2Done = false;
  let step3Active = false;
  let step3Done = false;
  let step4Active = false;
  let step4Done = false;

  const isCancelled = status === "CANCELLED";

  if (isCancelled) {
    step1Done = true;
  } else {
    if (status === "PENDING_PRACTITIONER_CONFIRMATION") {
      step2Active = true;
    } else if (
      status === "UPCOMING" ||
      status === "READY_TO_JOIN" ||
      status === "IN_PROGRESS" ||
      status === "AWAITING_COMPLETION_CONFIRMATION" ||
      status === "COMPLETED"
    ) {
      step2Done = true;
    }

    if (status === "READY_TO_JOIN" || status === "IN_PROGRESS") {
      step3Active = true;
    } else if (status === "AWAITING_COMPLETION_CONFIRMATION" || status === "COMPLETED") {
      step3Done = true;
    }

    if (status === "AWAITING_COMPLETION_CONFIRMATION") {
      step4Active = true;
    } else if (status === "COMPLETED") {
      step4Done = true;
    }
  }

  const renderDot = (active: boolean, done: boolean, text: string, isError = false) => {
    let bg = "#F5F5F5";
    let border = "#E8DED0";
    let textColor = "#6F7E78";

    if (done) {
      bg = "#EEF4EF";
      border = "#24564F";
      textColor = "#24564F";
    } else if (active) {
      if (isError) {
        bg = "#FEF3F2";
        border = "#DC2626";
        textColor = "#DC2626";
      } else {
        bg = "#FCFAF6";
        border = "#F5EBDD";
        textColor = "#24564F";
      }
    }

    return (
      <View style={styles.stepperItem}>
        <View style={[styles.stepperDot, { backgroundColor: bg, borderColor: border }]}>
          {done ? (
            <Ionicons name="checkmark" size={12} color="#24564F" />
          ) : isError ? (
            <Ionicons name="close" size={12} color="#DC2626" />
          ) : (
            <View style={[styles.stepperDotInner, { backgroundColor: active ? "#24564F" : "#C7D3CF" }]} />
          )}
        </View>
        <Text weight={active || done ? "700" : "600"} style={[styles.stepperText, { color: textColor }]}>
          {text}
        </Text>
      </View>
    );
  };

  return (
    <Card variant="outlined" padding="md" style={styles.stepperCard}>
      <View style={[styles.stepperRow, { flexDirection: rowDir }]}>
        {isCancelled ? (
          <>
            {renderDot(false, true, t("patientSessionsFlow.detail.steps.request"))}
            <View style={styles.stepperLineActiveError} />
            {renderDot(true, false, t("patientSessionsFlow.statuses.CANCELLED"), true)}
          </>
        ) : (
          <>
            {renderDot(false, step1Done, t("patientSessionsFlow.detail.steps.request"))}
            <View style={[styles.stepperLine, step2Done ? styles.stepperLineActive : null]} />
            {renderDot(step2Active, step2Done, t("patientSessionsFlow.detail.steps.confirmation"))}
            <View style={[styles.stepperLine, step3Done ? styles.stepperLineActive : null]} />
            {renderDot(step3Active, step3Done, t("patientSessionsFlow.detail.steps.sessionTime"))}
            <View style={[styles.stepperLine, step4Done ? styles.stepperLineActive : null]} />
            {renderDot(step4Active, step4Done, t("patientSessionsFlow.detail.steps.completion"))}
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  summaryHeader: {
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTitleWrap: {
    gap: 2,
  },
  summaryEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  summaryName: {
    fontSize: 18,
    lineHeight: 24,
  },
  summaryMeta: {
    fontSize: 13,
    lineHeight: 20,
  },
  newSummaryDivider: {
    height: 1.2,
    backgroundColor: "#EEF4EF",
    width: "100%",
    marginVertical: 4,
  },
  summaryStack: {
    gap: 4,
  },
  codeText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  cardStatusWrap: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E8DED0",
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  sectionBody: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  primaryAction: {
    borderRadius: 12,
    marginTop: 2,
  },
  secondaryButton: {
    borderRadius: 12,
    marginTop: 4,
  },
  joinHint: {
    fontSize: 12.5,
    lineHeight: 18,
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
    borderWidth: 1.5,
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
    fontSize: 14.5,
    lineHeight: 19,
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
    paddingVertical: 4,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailTextWrap: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  detailValue: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  stepperCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E8DED0",
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  stepperItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
    zIndex: 3,
  },
  stepperDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepperText: {
    fontSize: 9.5,
    lineHeight: 13,
    textAlign: "center",
  },
  stepperLine: {
    height: 3,
    backgroundColor: "#E8DED0",
    flex: 1,
    marginTop: -18,
    zIndex: 1,
  },
  stepperLineActive: {
    backgroundColor: "#24564F",
  },
  stepperLineActiveError: {
    height: 3,
    backgroundColor: "#DC2626",
    flex: 1,
    marginTop: -18,
    zIndex: 1,
  },
});
