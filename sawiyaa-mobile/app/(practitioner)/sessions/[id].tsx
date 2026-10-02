import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import {
  Button,
  Card,
  CompactActionRow,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../../src/components/ui";
import {
  useClosePractitionerSessionRuntime,
  useMarkPractitionerSessionNoShow,
  usePractitionerSession,
  usePreparePractitionerSessionRuntime,
  useResolvePractitionerSessionJoinContract,
} from "../../../src/features/practitioner/sessions/hooks";
import type {
  PractitionerSessionRoomCloseReason,
  PractitionerSessionDetails,
  PractitionerSessionJoinContract,
} from "../../../src/features/practitioner/sessions/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import {
  getSessionGeneralChatConversation,
  openSessionGeneralChat,
} from "../../../src/features/messages/api";
import { getAppDirection, getDirectionalIcon } from "../../../src/i18n/direction";
import {
  formatPractitionerDateTime,
  formatTimeZoneLabel,
  formatViewerDateTime,
} from "../../../src/lib/time-formatting";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { operationalJoinAllowed, operationalState } from "../../../src/features/sessions/operational";
import {
  getPractitionerSessionStatusKey,
  hasPractitionerSessionRequiredAction,
  type PractitionerSessionStatusKey,
} from "../../../src/features/practitioner/sessions/view-model";


export default function PractitionerSessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === "rtl";
  const rowDirection = isRTL ? "row-reverse" : "row";
  const locale = isRTL ? "ar-SA" : "en-US";
  const textAlign = isRTL ? "right" : "left";
  const detailNamespace = isRTL ? "practitioner.detail" : "practitioner.sessionDetail";
  const detailT = useCallback(
    (key: string, options?: Record<string, unknown>) => t(`${detailNamespace}.${key}`, options),
    [detailNamespace, t],
  );
  const autoJoinKeyRef = useRef<string | null>(null);

  const sessionQuery = usePractitionerSession(id ?? null);
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const closeRoomMutation = useClosePractitionerSessionRuntime();
  const noShowMutation = useMarkPractitionerSessionNoShow();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [joinContract, setJoinContract] =
    useState<PractitionerSessionJoinContract | null>(null);
  const [roomCloseSheetVisible, setRoomCloseSheetVisible] = useState(false);
  const [roomCloseReason, setRoomCloseReason] =
    useState<PractitionerSessionRoomCloseReason | null>(null);
  const [roomCloseResult, setRoomCloseResult] = useState<{
    wasAlreadyClosed: boolean;
  } | null>(null);
  const [roomCloseError, setRoomCloseError] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const handleBackToSessions = () => {
    router.replace("/(practitioner)/sessions");
  };

  const session = sessionQuery.data?.item ?? null;
  const sessionId = session?.id ?? null;
  const sessionPresentationStatus = session ? operationalState(session) : null;
  const sessionMode = session?.sessionMode;
  const canResolveJoin = Boolean(
    session?.operational?.join.canPrepareRuntime || session?.operational?.join.allowed,
  );

  const resolveJoinContract = useCallback(
    async (sessionId: string) => {
      const payload = await joinMutation.mutateAsync(sessionId);
      setJoinContract(payload.item);
      return payload.item;
    },
    [joinMutation],
  );

  useEffect(() => {
    if (
      !sessionId ||
      !canResolveJoin ||
      !sessionMode
    ) {
      autoJoinKeyRef.current = null;
      setJoinContract(null);
      return;
    }

    const nextKey = `${sessionId}:${sessionPresentationStatus}:${sessionMode}`;
    if (autoJoinKeyRef.current === nextKey) {
      return;
    }

    autoJoinKeyRef.current = nextKey;
    let active = true;

    resolveJoinContract(sessionId).catch(() => {
      if (active) {
        setJoinContract(null);
      }
    });

    return () => {
      active = false;
    };
  }, [
    resolveJoinContract,
    sessionId,
    sessionPresentationStatus,
    sessionMode,
    canResolveJoin,
  ]);

  const sessionFacts = useMemo(() => {
    if (!session) {
      return [];
    }

    return [
      {
        label: t("practitioner.detail.sessionType", "Ù†ÙˆØ¹ Ø§Ù„Ù…ÙˆØ¹Ø¯"),
        value: getFlowTypeLabel(session.flowType, detailT),
      },
      {
        label: t("practitioner.detail.mode", "Ù†ÙˆØ¹ Ø§Ù„Ø¬Ù„Ø³Ø©"),
        value: detailT(`modeValue.${session.sessionMode}`),
      },
      {
        label: t("practitioner.detail.duration", "Ø§Ù„Ù…Ø¯Ø©"),
        value: t("practitioner.sessions.duration", {
          minutes: session.durationMinutes,
        }),
      },
      {
        label: t("practitioner.detail.timezone", "Ø§Ù„Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø²Ù…Ù†ÙŠØ©"),
        value: getFriendlyTimezone(session.timezone, i18n.language, t),
      },
    ];
  }, [detailT, i18n.language, session, t]);

  const isRoomClosed =
    roomCloseResult?.wasAlreadyClosed === true ||
    session?.operational?.room.state === "CLOSED";
  const canCloseRoom =
    session?.sessionMode === "VIDEO" &&
    !isRoomClosed &&
    session?.operational?.room.state === "OPEN";
  const roomCloseAfterEnd = Boolean(
    session?.scheduledEndAt &&
      Date.now() >= new Date(session.scheduledEndAt).getTime(),
  );

  if (sessionQuery.isLoading) {
    return (
      <Screen bg="background" testID="practitioner-session-details-screen">
        <Header
          showBack
          onBack={handleBackToSessions}
          title={detailT("title")}
        />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <Screen bg="background" testID="practitioner-session-details-screen">
        <Header
          showBack
          onBack={handleBackToSessions}
          title={detailT("title")}
        />
        <ErrorState fullScreen onRetry={sessionQuery.refetch} />
      </Screen>
    );
  }

  const canNoShow = session.operational?.actions.canMarkPatientNoShow === true;
  const canPrepare = canShowPrepareAction(session, joinContract);
  const canCheckJoin = canShowJoinCheckAction(session, joinContract);
  const canJoinNow = operationalJoinAllowed(session);
  const canOpenMessages = session.chatAvailability?.canRead === true;
  const messagesAreReadOnly = session.chatAvailability?.readOnly;
  const hasRequiredAction = hasPractitionerSessionRequiredAction(session);
  const joinUrl = buildJoinUrl(joinContract);
  const canOpenJoinAction = canJoinNow && Boolean(joinUrl);
  const sessionStatusKey = getPractitionerSessionStatusKey(session);
  const stateHint = hasRequiredAction
    ? null
    : getSessionStateCopy(session, joinContract, locale, detailT, isRTL).hint;

  const handlePrepare = async () => {
    setFeedback(null);
    try {
      const payload = await prepareMutation.mutateAsync(session.id);
      setFeedback(
        payload.item.isPrepared
          ? detailT("prepareReady")
          : detailT("preparePending"),
      );
      if (session.operational?.join.canPrepareRuntime) {
        await resolveJoinContract(session.id).catch(() => {});
      }
    } catch {
      setFeedback(detailT("prepareError"));
    }
  };

  const handleCheckJoin = async () => {
    setFeedback(null);
    try {
      const contract = await resolveJoinContract(session.id);
      if (contract.canJoin && buildJoinUrl(contract)) {
        setFeedback(detailT("openRoomReady"));
        return;
      }
      setFeedback(
        detailT("joinBlocked", {
          reason: t(
            `${detailNamespace}.blocked.${contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"}` as const,
          ),
        }),
      );
    } catch {
      setFeedback(detailT("joinError"));
    }
  };

  const handleOpenRoom = async () => {
    if (!canOpenJoinAction || !joinUrl) return;
    setFeedback(null);
    try {
      const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
      if (!safeJoinUrl) {
        setFeedback(detailT("joinError"));
        return;
      }
      await Linking.openURL(safeJoinUrl);
      trackAnalyticsEvent("session_joined", {
        role: "practitioner",
        sessionId: session.id,
        sessionStatus: session.status,
        provider: joinContract?.provider || "unknown",
        source: "session_detail",
      });
    } catch {
      setFeedback(detailT("openRoomError"));
    }
  };

  const handleOpenMessages = async () => {
    if (!canOpenMessages) return;
    try {
      const payload = await getSessionGeneralChatConversation(session.id);
      if (payload.item?.conversationId) {
        router.push(`/(practitioner)/messages/${payload.item.conversationId}` as any);
      } else if (payload.chatAvailability.canSend) {
        const opened = await openSessionGeneralChat(session.id);
        if (opened.item?.conversationId) {
          router.push(`/(practitioner)/messages/${opened.item.conversationId}` as any);
        } else {
          setFeedback(
            isRTL
              ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø³Ø§Ø¦Ù„ Ø³Ø§Ø¨Ù‚Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø¬Ù„Ø³Ø©."
              : "No previous messages for this session.",
          );
        }
      } else {
        setFeedback(
          isRTL
            ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø³Ø§Ø¦Ù„ Ø³Ø§Ø¨Ù‚Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø¬Ù„Ø³Ø©."
            : "No previous messages for this session.",
        );
      }
    } catch {
        setFeedback(detailT("openMessagesError"));
    }
  };

  const openRoomCloseSheet = () => {
    setRoomCloseError(null);
    setRoomCloseReason(null);
    setRoomCloseSheetVisible(true);
  };

  const closeRoomReasonOptions: {
    value: PractitionerSessionRoomCloseReason;
    label: string;
  }[] = [
    {
      value: "TECHNICAL_ISSUE",
      label: t("practitioner.detail.roomClose.options.technicalIssue"),
    },
    {
      value: "PATIENT_NO_SHOW",
      label: t("practitioner.detail.roomClose.options.patientNoShow"),
    },
    {
      value: "ENDED_BY_AGREEMENT",
      label: t("practitioner.detail.roomClose.options.endedByAgreement"),
    },
    {
      value: "SAFETY_CONCERN",
      label: t("practitioner.detail.roomClose.options.safetyConcern"),
    },
    {
      value: "OTHER",
      label: t("practitioner.detail.roomClose.options.other"),
    },
  ];

  const handleCloseRoom = async () => {
    setRoomCloseError(null);

    if (!roomCloseAfterEnd && !roomCloseReason) {
      setRoomCloseError(t("practitioner.detail.roomClose.errors.reasonRequired"));
      return;
    }

    try {
      const payload = await closeRoomMutation.mutateAsync({
        sessionId: session.id,
        payload: {
          reason: roomCloseAfterEnd ? undefined : roomCloseReason ?? undefined,
        },
      });

      setRoomCloseResult({
        wasAlreadyClosed: payload.item.wasAlreadyClosed,
      });
      setRoomCloseSheetVisible(false);
      setRoomCloseReason(null);
      setRoomCloseError(null);
      setFeedback(
        payload.item.wasAlreadyClosed
          ? t("practitioner.detail.roomClose.alreadyClosed")
          : t("practitioner.detail.roomClose.success"),
      );
      await sessionQuery.refetch();
    } catch (error) {
      setRoomCloseError(getRoomCloseErrorMessage(error, detailT));
    }
  };

  const handleNoShow = async () => {
    setFeedback(null);
    try {
      await noShowMutation.mutateAsync(session.id);
      setJoinContract(null);
      setFeedback(detailT("noShowFeedback"));
      await sessionQuery.refetch();
    } catch {
      setFeedback(detailT("closeoutError"));
    }
  };

  const primaryAction = canOpenJoinAction
    ? {
        onPress: () => void handleOpenRoom(),
        disabled: false,
      }
    : canPrepare
      ? {
          onPress: () => void handlePrepare(),
          disabled: prepareMutation.isPending,
        }
      : canCheckJoin
        ? {
            onPress: () => void handleCheckJoin(),
            disabled: joinMutation.isPending,
          }
        : hasRequiredAction
          ? {
              onPress: () => setDetailsExpanded(true),
              disabled: false,
            }
        : null;

  const primaryActionTitle = canOpenJoinAction
    ? detailT("openRoom", { defaultValue: isRTL ? "الانضمام الآن" : "Join now" })
    : canPrepare
      ? (prepareMutation.isPending
        ? detailT("preparing")
        : detailT("prepare"))
      : canCheckJoin
        ? (joinMutation.isPending
          ? detailT("checkingJoin")
          : detailT("checkJoin"))
        : hasRequiredAction
          ? t("practitioner.sessions.actions.review")
          : null;

  return (
    <Screen bg="background" testID="practitioner-session-details-screen">
      <Header
        showBack
        onBack={handleBackToSessions}
        title={detailT("title")}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Session Summary Card */}
        <Card variant="outlined" padding="md" style={styles.summaryCard}>
          <View style={[styles.cardHeaderRow, { flexDirection: rowDirection }]}>
            <View style={styles.patientInfoGroup}>
              <Text
                weight="700"
                style={[styles.patientName, { textAlign }]}
                color={theme.colors.textPrimary}
                numberOfLines={1}
              >
                {session.patient?.displayName ?? t("practitioner.sessions.unknownPatient")}
              </Text>
            </View>
            <StatusBadge
              label={t(`practitioner.sessions.status.${sessionStatusKey}`)}
              status={mapSessionBadge(sessionStatusKey)}
            />
          </View>

          {/* Date & Time Row */}
          <View style={[styles.dateTimeRow, { flexDirection: rowDirection }]}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
            <Text weight="600" color={theme.colors.textSecondary} style={styles.dateTimeText}>
              {session.scheduledStartAt
                ? formatSessionDate(session.scheduledStartAt, locale, session.timezone)
                : t("practitioner.sessions.noSchedule")}
            </Text>
          </View>

          {/* Chips Row */}
          <View style={[styles.chipsRow, { flexDirection: rowDirection }]}>
            <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Text color={theme.colors.textSecondary} style={styles.metaTiny}>
                {t("practitioner.sessions.duration", {
                  minutes: session.durationMinutes,
                })}
              </Text>
            </View>
          </View>

          {/* Incomplete Warning Note if ENDED */}
          {session.operational?.state === "AWAITING_COMPLETION_CONFIRMATION" ? (
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: theme.colors.errorLight + "10",
                  borderColor: theme.colors.error + "25",
                  flexDirection: rowDirection,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={theme.colors.error}
                style={styles.warningIcon}
              />
              <Text color={theme.colors.error} style={[styles.warningText, { textAlign }]}>
                {t(
                  "practitioner.detail.endedWarningNote",
                  isRTL
                    ? "Ù‡Ø°Ù‡ Ø§Ù„Ø¬Ù„Ø³Ø© Ù„Ù… ØªÙØ³Ø¬Ù„ ÙƒÙ…ÙƒØªÙ…Ù„Ø©. Ø±Ø§Ø¬Ø¹ Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ø£Ùˆ Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ø¬Ù„Ø³Ø© Ø¥Ø°Ø§ Ù„Ø²Ù… Ø§Ù„Ø£Ù…Ø±."
                    : "This session was not recorded as completed. Review details or messages if needed.",
                )}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Actions Card Section */}
        <Card variant="outlined" padding="md" style={styles.sectionCard}>
          <Text weight="700" style={[styles.sectionTitle, { textAlign }]} color={theme.colors.textPrimary}>
            {detailT("actionsTitle")}
          </Text>
          <Text style={{ display: "none" }}>
            {isRTL ? "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø©" : "Available actions"}
          </Text>

          {stateHint ? (
            <Text color={theme.colors.textMuted} style={[styles.helperText, { textAlign }]}>
              {stateHint}
            </Text>
          ) : null}

          <View style={styles.actionColumn}>
            {/* If primary action exists */}
            {primaryActionTitle && primaryAction ? (
              <Button
                title={primaryActionTitle}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
                style={styles.primaryActionButton}
              />
            ) : null}

            {/* If no action is required */}
            {!primaryActionTitle && !canNoShow && !hasRequiredAction ? (
              <View style={styles.noActionWrapper}>
                <Text color={theme.colors.textSecondary} style={[styles.noActionText, { textAlign }]}>
                  {detailT("noImmediateAction")}
                </Text>
                <Text style={{ display: "none" }}>
                  {isRTL
                    ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ù…Ø·Ù„ÙˆØ¨Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø¢Ù†."
                    : "No session action is required right now."}
                </Text>
              </View>
            ) : null}

            {/* Session Messages - secondary optional action */}
            {canOpenMessages ? (
              <View style={styles.messagesBlock}>
                <SessionSecondaryActionRow
                  label={detailT("messages")}
                  onPress={() => void handleOpenMessages()}
                  isRTL={isRTL}
                  textAlign={textAlign}
                />
                {messagesAreReadOnly ? (
                  <Text
                    color={theme.colors.textMuted}
                    style={[styles.helperText, { textAlign }]}
                  >
                    {t("practitioner.detail.messagesReadOnly")}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {canCloseRoom ? (
              <View style={styles.closeRoomBlock}>
                <Button
                  title={detailT("roomClose.action")}
                  variant="secondary"
                  leftIcon={
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color={theme.colors.error}
                    />
                  }
                  onPress={openRoomCloseSheet}
                  style={[
                    styles.closeRoomButton,
                    { borderColor: theme.colors.error + "40" },
                  ]}
                />
              </View>
            ) : null}

            {/* No-show action */}
            {canNoShow ? (
              <View style={styles.noShowWrapper}>
                <CompactActionRow
                  label={
                    noShowMutation.isPending
                      ? t("practitioner.detail.markingNoShow")
                      : t("practitioner.detail.markNoShow")
                  }
                  onPress={() => void handleNoShow()}
                />
              </View>
            ) : null}
          </View>

          {/* Feedback & mutation pending state helper texts */}
          {joinMutation.isPending && !canOpenJoinAction ? (
            <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
              {t("practitioner.detail.checkingJoin")}
            </Text>
          ) : null}
          {prepareMutation.isPending ? (
            <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
              {t("practitioner.detail.preparing")}
            </Text>
          ) : null}
          {joinContract?.blockedReason && !canOpenJoinAction ? (
            <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
              {t("practitioner.detail.joinBlocked", {
                reason: t(
                  `practitioner.detail.blocked.${joinContract.blockedReason}` as const,
                ),
              })}
            </Text>
          ) : null}
          {!session.operational?.join.allowed &&
          session.operational.join.opensAt &&
          session.operational?.timelineBucket === "ACTIONABLE" ? (
            <Text
              color={theme.colors.textSecondary}
              style={[styles.helperText, { textAlign }]}
            >
              {t("practitioner.detail.joinAvailableAt", {
                datetime: formatSessionDate(
                  session.operational.join.opensAt,
                  locale,
                  session.timezone,
                ),
              })}
            </Text>
          ) : null}
        </Card>

        {isRoomClosed ? (
          <Card variant="flat" padding="md">
            <View style={[styles.roomClosedNotice, { flexDirection: rowDirection }]}>
              <View
                style={[
                  styles.roomClosedIcon,
                  { backgroundColor: theme.colors.success + "15" },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.colors.success}
                />
              </View>
              <View style={styles.roomClosedTextWrap}>
                <Text weight="700" style={{ textAlign }}>
                  {t("practitioner.detail.roomClose.alreadyClosed")}
                </Text>
                <Text color={theme.colors.textSecondary} style={{ textAlign }}>
                  {t("practitioner.detail.roomClose.success")}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Quick Information / Session Facts Card */}
        <Card variant="outlined" padding="md" style={styles.sectionCard}>
          <TouchableOpacity
            onPress={() => setDetailsExpanded((expanded) => !expanded)}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsExpanded }}
            style={[styles.detailsToggle, { flexDirection: rowDirection }]}
          >
            <Text weight="700" style={[styles.sectionTitle, { textAlign }]} color={theme.colors.textPrimary}>
              {detailT("sessionFacts")}
            </Text>
            <Ionicons
              name={detailsExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          {detailsExpanded
            ? sessionFacts.map((fact, index) => (
                <SummaryRow
                  key={fact.label}
                  label={fact.label}
                  value={fact.value}
                  isLast={index === sessionFacts.length - 1}
                />
              ))
            : null}
        </Card>

        {/* Bottom feedback status panel */}
        {feedback ? (
          <Card variant="flat" padding="md">
            <Text color={theme.colors.textSecondary} style={{ textAlign }}>{feedback}</Text>
          </Card>
        ) : null}
      </ScrollView>

      <Modal
        visible={roomCloseSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoomCloseSheetVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRoomCloseSheetVisible(false)}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text weight="700" style={[styles.modalTitle, { textAlign }]}>
              {roomCloseAfterEnd
                ? t("practitioner.detail.roomClose.afterTitle")
                : t("practitioner.detail.roomClose.beforeTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={[styles.modalBody, { textAlign }]}>
              {roomCloseAfterEnd
                ? t("practitioner.detail.roomClose.afterNote")
                : t("practitioner.detail.roomClose.beforeNote")}
            </Text>

            {!roomCloseAfterEnd ? (
              <View style={styles.reasonList}>
                <Text weight="600" style={{ textAlign }}>
                  {t("practitioner.detail.roomClose.reasonLabel")}
                </Text>
                <Text color={theme.colors.textMuted} style={[styles.reasonHelp, { textAlign }]}>
                  {t("practitioner.detail.roomClose.reasonHelp")}
                </Text>

                <View style={styles.reasonGrid}>
                  {closeRoomReasonOptions.map((option) => {
                    const selected = roomCloseReason === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setRoomCloseReason(option.value)}
                        activeOpacity={0.85}
                        style={[
                          styles.reasonChip,
                          {
                            borderColor: selected
                              ? theme.colors.primary
                              : theme.colors.borderLight,
                            backgroundColor: selected
                              ? theme.colors.primary + "12"
                              : theme.colors.surface,
                          },
                        ]}
                      >
                        <Ionicons
                          name={selected ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={selected ? theme.colors.primary : theme.colors.textMuted}
                        />
                        <Text
                          weight="600"
                          style={[styles.reasonChipText, { textAlign }]}
                          color={selected ? theme.colors.primary : theme.colors.textPrimary}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {roomCloseError ? (
              <View
                style={[
                  styles.roomCloseError,
                  { backgroundColor: theme.colors.error + "12" },
                ]}
              >
                <Ionicons name="warning" size={16} color={theme.colors.error} />
                <Text style={[styles.roomCloseErrorText, { color: theme.colors.error }]}>
                  {roomCloseError}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Button
                title={
                  roomCloseAfterEnd
                    ? t("practitioner.detail.roomClose.submitAfter")
                    : t("practitioner.detail.roomClose.submitBefore")
                }
                onPress={() => void handleCloseRoom()}
                loading={closeRoomMutation.isPending}
                disabled={!roomCloseAfterEnd && !roomCloseReason}
              />
              <Button
                title={
                  roomCloseAfterEnd
                    ? t("practitioner.detail.roomClose.continue")
                    : t("practitioner.detail.roomClose.cancel")
                }
                variant="secondary"
                onPress={() => setRoomCloseSheetVisible(false)}
                disabled={closeRoomMutation.isPending}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const isRTL = getAppDirection(i18n.language) === "rtl";
  const textAlign = isRTL ? "right" : "left";

  return (
    <View
      style={[
        styles.summaryRow,
        { flexDirection: isRTL ? "row-reverse" : "row" },
        {
          borderBottomColor: theme.colors.borderLight,
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
    >
      <Text color={theme.colors.textMuted} style={{ textAlign }}>
        {label}
      </Text>
      <Text weight="600" style={[styles.summaryValue, { textAlign }]}>
        {value}
      </Text>
    </View>
  );
}

function SessionSecondaryActionRow({
  label,
  onPress,
  isRTL,
  textAlign,
}: {
  label: string;
  onPress: () => void;
  isRTL: boolean;
  textAlign: "left" | "right";
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.secondaryActionRow,
        {
          borderColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow ?? "#000000",
        },
        {
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View
        style={[
          styles.secondaryActionContent,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={[styles.secondaryActionIconBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Ionicons
            name="chatbubbles-outline"
            size={16}
            color={theme.colors.primary}
          />
        </View>
        <Text
          color={theme.colors.textPrimary}
          weight="600"
          style={[styles.secondaryActionLabel, { textAlign }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Ionicons
        name={getDirectionalIcon("disclosure", isRTL)}
        size={18}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

function canShowPrepareAction(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
) {
  return session.operational?.actions.canPrepareRuntime === true && !joinContract?.canJoin;
}

function canShowJoinCheckAction(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
) {
  return session.operational?.join.canPrepareRuntime === true && !joinContract?.canJoin;
}

function buildJoinUrl(joinContract: PractitionerSessionJoinContract | null) {
  if (!joinContract?.canJoin || !joinContract.roomUrl) {
    return null;
  }
  if (joinContract.joinToken && joinContract.provider === "DAILY") {
    return `${joinContract.roomUrl}${joinContract.roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(joinContract.joinToken)}`;
  }
  return joinContract.roomUrl;
}

function getRoomCloseErrorMessage(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const code = getErrorCode(error);

  switch (code) {
    case "SESSION_VIDEO_ROOM_CLOSE_ONLY_AFTER_START":
      return t("practitioner.detail.roomClose.errors.onlyAfterStart");
    case "SESSION_ROOM_CLOSED":
      return t("practitioner.detail.roomClose.alreadyClosed");
    case "SESSION_VIDEO_ROOM_CLOSE_REASON_REQUIRED":
      return t("practitioner.detail.roomClose.errors.reasonRequired");
    case "SESSION_VIDEO_ROOM_CLOSE_NOT_ALLOWED":
      return t("practitioner.detail.roomClose.errors.notAllowed");
    default:
      return t("practitioner.detail.roomClose.errors.generic");
  }
}

function getErrorCode(error: unknown) {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as
      | {
          errorCode?: string;
          error?: string;
        }
      | undefined;

    return payload?.errorCode ?? payload?.error ?? null;
  }

  return null;
}

function formatSessionDate(
  isoString: string,
  locale: string,
  timeZone: string | null | undefined,
) {
  return (
    formatPractitionerDateTime(isoString, timeZone, {
      locale,
      fallbackText: "",
    }) ||
    formatViewerDateTime(isoString, {
      locale,
      fallbackText: "-",
    })
  );
}

function getFlowTypeLabel(
  flowType: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (flowType === "SCHEDULED") {
    return t("practitioner.detail.flowTypeValue.SCHEDULED");
  }
  if (flowType === "INSTANT") {
    return t("practitioner.detail.flowTypeValue.INSTANT");
  }
  return t("practitioner.detail.flowTypeValue.DEFAULT");
}

function getFriendlyTimezone(
  timezone: string | null,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!timezone) {
    return t("practitioner.common.notAvailable");
  }

  // e.g. "Africa/Cairo" -> "Cairo"
  const cityToken = timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
  const cityMap = language?.startsWith("ar")
    ? {
        Cairo: "Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©",
        Riyadh: "Ø§Ù„Ø±ÙŠØ§Ø¶",
        Dubai: "Ø¯Ø¨ÙŠ",
        Kuwait: "Ø§Ù„ÙƒÙˆÙŠØª",
        Doha: "Ø§Ù„Ø¯ÙˆØ­Ø©",
      }
    : {
        Cairo: "Cairo",
        Riyadh: "Riyadh",
        Dubai: "Dubai",
        Kuwait: "Kuwait",
        Doha: "Doha",
      };

  const friendlyCity = cityMap[cityToken as keyof typeof cityMap] ?? cityToken;
  const fullLabel = formatTimeZoneLabel(timezone, {
    locale: language,
    fallbackText: "",
  });

  // Extract offset inside parentheses, e.g. "(GMT+2)" or "(ØºØ±ÙŠÙ†ØªØ´ +2)"
  const offsetMatch = fullLabel.match(/\(([^)]+)\)/);
  const offset = offsetMatch ? ` (${offsetMatch[1]})` : "";

  return `${friendlyCity}${offset}`;
}

function getSessionStateCopy(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
  locale: string,
  detailT: (key: string, options?: Record<string, unknown>) => string,
  isRTL: boolean,
) {
  switch (session.operational?.state) {
    case "UPCOMING":
      return {
        summary: detailT("stateNote.UPCOMING"),
        hint:
          !session.operational.join.allowed &&
          session.operational.join.opensAt
            ? detailT("joinAvailableAt", {
                datetime: formatSessionDate(
                  session.operational.join.opensAt,
                  locale,
                  session.timezone,
                ),
              })
            : null,
      };
    case "READY_TO_JOIN":
      return {
        summary: joinContract?.canJoin
          ? detailT("stateNote.READY_TO_JOIN_NOW")
          : detailT("stateNote.READY_TO_JOIN_CHECK"),
        hint:
          joinContract?.canJoin ||
          joinContract?.blockedReason !== "SESSION_RUNTIME_NOT_PREPARED"
            ? null
            : detailT("stateNote.READY_TO_JOIN_PREPARE"),
      };
    case "IN_PROGRESS":
      return {
        summary: joinContract?.canJoin
          ? detailT("stateNote.IN_PROGRESS_OPEN")
          : detailT("stateNote.IN_PROGRESS"),
        hint: null,
      };
    case "COMPLETED":
      return {
        summary: isRTL ? "ØªÙ…Øª Ø§Ù„Ø¬Ù„Ø³Ø© Ø¨Ù†Ø¬Ø§Ø­." : "The session completed successfully.",
        hint: null,
      };
    case "CANCELLED":
      return {
        summary: detailT("stateNote.CANCELLED"),
        hint: null,
      };
    case "AWAITING_COMPLETION_CONFIRMATION":
      return {
        summary: isRTL ? "Ø§Ù„Ø¬Ù„Ø³Ø© ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø©." : "The session is incomplete.",
        hint: null,
      };
    case "EXPIRED":
      return {
        summary: detailT("stateNote.UNAVAILABLE"),
        hint: null,
      };
    case "PATIENT_NO_SHOW":
      return {
        summary: isRTL ? "Ù„Ù… ÙŠØ­Ø¶Ø± Ø§Ù„Ù…Ø±ÙŠØ¶ Ø§Ù„Ù…ÙˆØ¹Ø¯." : "The patient did not show up.",
        hint: null,
      };
    case "PRACTITIONER_NO_SHOW":
    case "BOTH_NO_SHOW":
      return {
        summary: isRTL ? "Ø§Ù„Ø¬Ù„Ø³Ø© Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©." : "The session is under review.",
        hint: null,
      };
    default:
      return {
        summary: "",
        hint: null,
      };
  }
}

function mapSessionBadge(status: PractitionerSessionStatusKey) {
  switch (status) {
    case "readyToJoin":
    case "inProgress":
      return "success" as const;
    case "upcoming":
    case "underReview":
    case "unavailable":
    case "actionRequired":
      return "warning" as const;
    case "completed":
      return "default" as const;
    case "cancelled":
    case "noShow":
      return "error" as const;
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  summaryCard: {
    gap: 14,
    borderRadius: 16,
  },
  cardHeaderRow: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  patientInfoGroup: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 18,
    lineHeight: 24,
  },
  sessionCode: {
    fontSize: 11,
    lineHeight: 15,
  },
  dateTimeRow: {
    alignItems: "center",
    gap: 8,
  },
  dateTimeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipsRow: {
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  metaBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaTiny: {
    fontSize: 11,
    lineHeight: 15,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    alignItems: "flex-start",
    marginTop: 4,
  },
  warningIcon: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    gap: 12,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  detailsToggle: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionColumn: {
    gap: 10,
  },
  primaryActionButton: {
    width: "100%",
    borderRadius: 10,
    minHeight: 44,
  },
  noActionWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  noActionText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  messagesBlock: {
    gap: 6,
    width: "100%",
  },
  closeRoomBlock: {
    marginTop: 2,
  },
  closeRoomButton: {
    borderRadius: 10,
  },
  noShowWrapper: {
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 16,
  },
  secondaryActionRow: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  secondaryActionContent: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  secondaryActionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionLabel: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  summaryRow: {
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  roomClosedNotice: {
    alignItems: "center",
    gap: 12,
  },
  roomClosedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  roomClosedTextWrap: {
    flex: 1,
    gap: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 14,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  reasonList: {
    gap: 10,
  },
  reasonHelp: {
    fontSize: 12,
    lineHeight: 18,
  },
  reasonGrid: {
    gap: 10,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonChipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  roomCloseError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roomCloseErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  modalActions: {
    gap: 10,
  },
});
