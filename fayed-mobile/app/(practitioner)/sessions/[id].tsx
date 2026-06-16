import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CompactActionRow,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  StatusChip,
  Text,
} from "../../../src/components/ui";
import {
  useMarkPractitionerSessionCompleted,
  useMarkPractitionerSessionNoShow,
  usePractitionerSession,
  usePreparePractitionerSessionRuntime,
  useResolvePractitionerSessionJoinContract,
} from "../../../src/features/practitioner/sessions/hooks";
import type {
  PractitionerSessionDetails,
  PractitionerSessionJoinContract,
  SessionPresentationStatus,
} from "../../../src/features/practitioner/sessions/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";
import { openSessionGeneralChat } from "../../../src/features/messages/api";
import { getAppDirection } from "../../../src/i18n/direction";
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const COMPLETE_ALLOWED: SessionPresentationStatus[] = ["JOINABLE", "IN_PROGRESS"];
const NO_SHOW_ALLOWED: SessionPresentationStatus[] = [
  "UPCOMING",
  "JOINABLE",
  "IN_PROGRESS",
];
const RUNTIME_CHECKABLE: SessionPresentationStatus[] = [
  "UPCOMING",
  "JOINABLE",
  "IN_PROGRESS",
];
const PREPARE_ELIGIBLE: SessionPresentationStatus[] = ["UPCOMING", "JOINABLE"];

export default function PractitionerSessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === "rtl";
  const locale = isRTL ? "ar-SA" : "en-US";
  const textAlign = isRTL ? "right" : "left";
  const autoJoinKeyRef = useRef<string | null>(null);

  const sessionQuery = usePractitionerSession(id ?? null);
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const completeMutation = useMarkPractitionerSessionCompleted();
  const noShowMutation = useMarkPractitionerSessionNoShow();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [joinContract, setJoinContract] =
    useState<PractitionerSessionJoinContract | null>(null);
  const handleBackToSessions = () => {
    router.replace("/(practitioner)/sessions");
  };

  const session = sessionQuery.data?.item ?? null;
  const sessionId = session?.id ?? null;
  const sessionPresentationStatus = session?.presentationStatus;
  const sessionMode = session?.sessionMode;

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
      !sessionPresentationStatus ||
      !sessionMode ||
      !shouldAutoCheckJoin(sessionPresentationStatus, sessionMode)
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
  ]);

  const sessionFacts = useMemo(() => {
    if (!session) {
      return [];
    }

    return [
      {
        label: t("practitioner.detail.sessionType"),
        value: getFlowTypeLabel(session.flowType, t),
      },
      {
        label: t("practitioner.detail.mode"),
        value: t(`practitioner.detail.modeValue.${session.sessionMode}`),
      },
      {
        label: t("practitioner.detail.duration"),
        value: t("practitioner.sessions.duration", {
          minutes: session.durationMinutes,
        }),
      },
      {
        label: t("practitioner.detail.timezone"),
        value: formatTimezoneLabel(session.timezone, i18n.language, t),
      },
    ];
  }, [i18n.language, session, t]);

  if (sessionQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={handleBackToSessions}
          title={t("practitioner.detail.title")}
        />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={handleBackToSessions}
          title={t("practitioner.detail.title")}
        />
        <ErrorState fullScreen onRetry={sessionQuery.refetch} />
      </Screen>
    );
  }

  const canComplete = COMPLETE_ALLOWED.includes(session.presentationStatus);
  const canNoShow = NO_SHOW_ALLOWED.includes(session.presentationStatus);
  const canPrepare = canShowPrepareAction(session, joinContract);
  const canCheckJoin = canShowJoinCheckAction(session, joinContract);
  const canJoinNow = session.joinAvailability?.canJoin === true;
  const canOpenMessages =
    session.chatAvailability?.canRead === true;
  const messagesAreReadOnly = session.chatAvailability.readOnly;
  const joinUrl = buildJoinUrl(joinContract);
  const canOpenJoinAction = canJoinNow && Boolean(joinUrl);
  const stateCopy = getSessionStateCopy(session, joinContract, locale, t);

  const handlePrepare = async () => {
    setFeedback(null);
    try {
      const payload = await prepareMutation.mutateAsync(session.id);
      setFeedback(
        payload.item.isPrepared
          ? t("practitioner.detail.prepareReady")
          : t("practitioner.detail.preparePending"),
      );
      if (shouldAutoCheckJoin(session.presentationStatus, session.sessionMode)) {
        await resolveJoinContract(session.id).catch(() => {});
      }
    } catch {
      setFeedback(t("practitioner.detail.prepareError"));
    }
  };

  const handleCheckJoin = async () => {
    setFeedback(null);
    try {
      const contract = await resolveJoinContract(session.id);
      if (contract.canJoin && buildJoinUrl(contract)) {
        setFeedback(t("practitioner.detail.openRoomReady"));
        return;
      }
      setFeedback(
        t("practitioner.detail.joinBlocked", {
          reason: t(
            `practitioner.detail.blocked.${contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"}` as const,
          ),
        }),
      );
    } catch {
      setFeedback(t("practitioner.detail.joinError"));
    }
  };

  const handleOpenRoom = async () => {
    if (!canOpenJoinAction || !joinUrl) return;
    setFeedback(null);
    try {
      const safeJoinUrl = normalizeAllowedExternalUrl(joinUrl);
      if (!safeJoinUrl) {
        setFeedback(t("practitioner.detail.joinError"));
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
      setFeedback(t("practitioner.detail.openRoomError"));
    }
  };

  const handleOpenMessages = async () => {
    if (!canOpenMessages) return;
    try {
      const payload = await openSessionGeneralChat(session.id);
      router.push(`/(practitioner)/messages/${payload.item.conversationId}` as any);
    } catch {
      setFeedback(t("practitioner.detail.openMessagesError"));
    }
  };

  const handleComplete = async () => {
    setFeedback(null);
    try {
      await completeMutation.mutateAsync(session.id);
      setJoinContract(null);
      setFeedback(t("practitioner.detail.completedFeedback"));
      await sessionQuery.refetch();
    } catch {
      setFeedback(t("practitioner.detail.closeoutError"));
    }
  };

  const handleNoShow = async () => {
    setFeedback(null);
    try {
      await noShowMutation.mutateAsync(session.id);
      setJoinContract(null);
      setFeedback(t("practitioner.detail.noShowFeedback"));
      await sessionQuery.refetch();
    } catch {
      setFeedback(t("practitioner.detail.closeoutError"));
    }
  };

  const primaryAction = canOpenJoinAction
    ? {
        title: t("practitioner.detail.openRoom"),
        onPress: () => void handleOpenRoom(),
        disabled: false,
      }
    : canPrepare
      ? {
          title: prepareMutation.isPending
            ? t("practitioner.detail.preparing")
            : t("practitioner.detail.prepare"),
          onPress: () => void handlePrepare(),
          disabled: prepareMutation.isPending,
        }
      : canCheckJoin
        ? {
            title: joinMutation.isPending
              ? t("practitioner.detail.checkingJoin")
              : t("practitioner.detail.checkJoin"),
            onPress: () => void handleCheckJoin(),
            disabled: joinMutation.isPending,
          }
        : canComplete
          ? {
              title: completeMutation.isPending
                ? t("practitioner.detail.completing")
                : t("practitioner.detail.markCompleted"),
              onPress: () => void handleComplete(),
              disabled: completeMutation.isPending,
            }
          : null;

  return (
    <Screen bg="background">
      <Header
        showBack
        onBack={handleBackToSessions}
        title={t("practitioner.detail.title")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="md" style={styles.summaryCard}>
          <View
            style={[
              styles.summaryTopRow,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <View
              style={[
                styles.summaryTextWrap,
                { alignItems: isRTL ? "flex-end" : "flex-start" },
              ]}
            >
              <Text
                weight="600"
                style={[styles.summaryName, { textAlign }]}
                numberOfLines={1}
              >
                {session.patient?.displayName ??
                  t("practitioner.sessions.unknownPatient")}
              </Text>
            </View>
            <StatusBadge
              label={t(`practitioner.presentationStatus.${session.presentationStatus}`)}
              status={mapSessionBadge(session.presentationStatus)}
            />
          </View>

          <Text color={theme.colors.textSecondary} style={[styles.summaryMeta, { textAlign }]}>
            {session.scheduledStartAt
              ? t("practitioner.detail.sessionAt", {
                  datetime: formatSessionDate(session.scheduledStartAt, locale),
                })
              : t("practitioner.sessions.noSchedule")}
          </Text>

          <View
            style={[
              styles.summaryChipsRow,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <StatusChip
              label={t("practitioner.sessions.duration", {
                minutes: session.durationMinutes,
              })}
              tone="default"
              showDot={false}
            />
            <StatusChip
              label={t(
                `practitioner.detail.modeValue.${session.sessionMode}`,
              )}
              tone="info"
              showDot={false}
            />
            <StatusChip
              label={getFlowTypeLabel(session.flowType, t)}
              tone="default"
              showDot={false}
            />
          </View>

          <Text
            color={theme.colors.textMuted}
            style={[styles.summaryCode, { textAlign }]}
            numberOfLines={1}
          >
            {t("practitioner.detail.sessionCodeLabel", {
              sessionCode: session.sessionCode,
            })}
          </Text>
        </Card>

        <Card variant="outlined" padding="md" style={styles.sectionCard}>
          <Text weight="600" style={[styles.sectionTitle, { textAlign }]}>
            {t("practitioner.detail.actionsTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={[styles.actionSummary, { textAlign }]}>
            {stateCopy.summary}
          </Text>
          {stateCopy.hint ? (
            <Text color={theme.colors.textMuted} style={[styles.helperText, { textAlign }]}>
              {stateCopy.hint}
            </Text>
          ) : null}

          <View style={styles.actionColumn}>
            {primaryAction ? (
              <Button
                title={primaryAction.title}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
              />
            ) : null}

            {canOpenMessages ? (
              <View style={styles.messagesBlock}>
                <SessionSecondaryActionRow
                  label={t("practitioner.detail.messages")}
                  onPress={() => void handleOpenMessages()}
                  isRTL={isRTL}
                  textAlign={textAlign}
                />
                {messagesAreReadOnly ? (
                  <Text
                    color={theme.colors.textSecondary}
                    style={[styles.helperText, { textAlign }]}
                  >
                    {t("practitioner.detail.messagesReadOnly")}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {canNoShow ? (
              <CompactActionRow
                label={
                  noShowMutation.isPending
                    ? t("practitioner.detail.markingNoShow")
                    : t("practitioner.detail.markNoShow")
                }
                onPress={() => void handleNoShow()}
              />
            ) : null}
          </View>

          {joinMutation.isPending ? (
            <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
              {t("practitioner.detail.checkingJoin")}
            </Text>
          ) : null}
          {prepareMutation.isPending ? (
            <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
              {t("practitioner.detail.preparing")}
            </Text>
          ) : null}
          {joinContract?.blockedReason ? (
            <Text color={theme.colors.textSecondary} style={[styles.helperText, { textAlign }]}>
              {t("practitioner.detail.joinBlocked", {
                reason: t(
                  `practitioner.detail.blocked.${joinContract.blockedReason}` as const,
                ),
              })}
            </Text>
          ) : null}
          {!session.joinAvailability?.canJoin &&
          session.joinAvailability?.availableAt &&
          session.presentationStatus === "UPCOMING" ? (
            <Text
              color={theme.colors.textSecondary}
              style={[styles.helperText, { textAlign }]}
            >
              {t("practitioner.detail.joinAvailableAt", {
                datetime: formatSessionDate(
                  session.joinAvailability.availableAt,
                  locale,
                ),
              })}
            </Text>
          ) : null}
        </Card>

        <Card variant="outlined" padding="md" style={styles.sectionCard}>
          <Text weight="600" style={[styles.sectionTitle, { textAlign }]}>
            {t("practitioner.detail.sessionFacts")}
          </Text>
          {sessionFacts.map((fact, index) => (
            <SummaryRow
              key={fact.label}
              label={fact.label}
              value={fact.value}
              isLast={index === sessionFacts.length - 1}
            />
          ))}
        </Card>

        {feedback ? (
          <Card variant="flat" padding="md">
            <Text color={theme.colors.textSecondary}>{feedback}</Text>
          </Card>
        ) : null}
      </ScrollView>
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
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={18}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

function shouldAutoCheckJoin(
  presentationStatus: SessionPresentationStatus,
  sessionMode: PractitionerSessionDetails["sessionMode"],
) {
  return (
    sessionMode === "VIDEO" &&
    RUNTIME_CHECKABLE.includes(presentationStatus)
  );
}

function canShowPrepareAction(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
) {
  if (session.sessionMode !== "VIDEO") return false;
  if (!PREPARE_ELIGIBLE.includes(session.presentationStatus)) return false;
  if (session.joinAvailability?.blockedReason === "SESSION_JOIN_WINDOW_CLOSED") {
    return false;
  }
  if (joinContract?.canJoin) return false;

  return (
    !joinContract ||
    joinContract.blockedReason === "SESSION_RUNTIME_NOT_PREPARED" ||
    joinContract.blockedReason === "SESSION_TIME_WINDOW_NOT_OPEN"
  );
}

function canShowJoinCheckAction(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
) {
  if (session.sessionMode !== "VIDEO") return false;
  if (!RUNTIME_CHECKABLE.includes(session.presentationStatus)) return false;
  if (session.joinAvailability?.blockedReason === "SESSION_JOIN_WINDOW_CLOSED") {
    return false;
  }
  if (joinContract?.blockedReason === "SESSION_JOIN_WINDOW_CLOSED") {
    return false;
  }
  return !joinContract?.canJoin;
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

function formatSessionDate(isoString: string, locale: string) {
  return new Date(isoString).toLocaleString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
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

function formatTimezoneLabel(
  timezone: string | null,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!timezone) {
    return t("practitioner.common.notAvailable");
  }

  const cityToken = timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
  const cityMap = language?.startsWith("ar")
    ? {
        Cairo: "القاهرة",
        Riyadh: "الرياض",
        Dubai: "دبي",
        Kuwait: "الكويت",
        Doha: "الدوحة",
      }
    : {
        Cairo: "Cairo",
        Riyadh: "Riyadh",
        Dubai: "Dubai",
        Kuwait: "Kuwait",
        Doha: "Doha",
      };

  return t("practitioner.detail.timezoneValue", {
    city: cityMap[cityToken as keyof typeof cityMap] ?? cityToken,
  });
}

function getSessionStateCopy(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  switch (session.presentationStatus) {
    case "UPCOMING":
      return {
        summary: t("practitioner.detail.stateNote.UPCOMING"),
        hint:
          !session.joinAvailability?.canJoin &&
          session.joinAvailability?.availableAt
            ? t("practitioner.detail.joinAvailableAt", {
                datetime: formatSessionDate(
                  session.joinAvailability.availableAt,
                  locale,
                ),
              })
            : null,
      };
    case "JOINABLE":
      return {
        summary: joinContract?.canJoin
          ? t("practitioner.detail.stateNote.READY_TO_JOIN_NOW")
          : t("practitioner.detail.stateNote.READY_TO_JOIN_CHECK"),
        hint:
          joinContract?.canJoin ||
          joinContract?.blockedReason !== "SESSION_RUNTIME_NOT_PREPARED"
            ? null
            : t("practitioner.detail.stateNote.READY_TO_JOIN_PREPARE"),
      };
    case "IN_PROGRESS":
      return {
        summary: joinContract?.canJoin
          ? t("practitioner.detail.stateNote.IN_PROGRESS_OPEN")
          : t("practitioner.detail.stateNote.IN_PROGRESS"),
        hint: null,
      };
    case "COMPLETED":
      return {
        summary: t("practitioner.detail.noImmediateAction"),
        hint: null,
      };
    case "CANCELLED":
      return {
        summary: t("practitioner.detail.stateNote.CANCELLED"),
        hint: null,
      };
    case "ENDED":
      return {
        summary: t("practitioner.detail.noImmediateAction"),
        hint: null,
      };
    case "UNAVAILABLE":
      return {
        summary: t("practitioner.detail.stateNote.UNAVAILABLE"),
        hint: null,
      };
    case "NO_SHOW":
      return {
        summary: t("practitioner.detail.noImmediateAction"),
        hint: null,
      };
    case "UNDER_REVIEW":
      return {
        summary: t("practitioner.detail.noImmediateAction"),
        hint: null,
      };
  }
}

function mapSessionBadge(status: SessionPresentationStatus) {
  switch (status) {
    case "JOINABLE":
    case "IN_PROGRESS":
      return "success" as const;
    case "UPCOMING":
    case "UNAVAILABLE":
    case "UNDER_REVIEW":
      return "warning" as const;
    case "COMPLETED":
    case "ENDED":
      return "default" as const;
    case "CANCELLED":
    case "NO_SHOW":
      return "error" as const;
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 10,
  },
  summaryCard: {
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryName: {
    fontSize: 17,
    marginBottom: 2,
  },
  summaryCode: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  summaryMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryChipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  sectionCard: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
  },
  actionSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  nextStepBox: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
  },
  nextStepValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  messagesBlock: {
    gap: 6,
    width: "100%",
  },
  actionColumn: {
    gap: 8,
  },
  secondaryActionRow: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  secondaryActionContent: {
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  secondaryActionIconBox: {
    width: 30,
    height: 30,
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
    paddingVertical: 8,
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
  },
});
