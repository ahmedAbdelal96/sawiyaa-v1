import React, { useEffect, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
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
  SessionStatus,
} from "../../../src/features/practitioner/sessions/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../src/lib/external-url";
import { trackAnalyticsEvent } from "../../../src/lib/analytics";

const COMPLETE_ALLOWED: SessionStatus[] = ["READY_TO_JOIN", "IN_PROGRESS"];
const NO_SHOW_ALLOWED: SessionStatus[] = [
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
];
const RUNTIME_CHECKABLE: SessionStatus[] = [
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
];
const PREPARE_ELIGIBLE: SessionStatus[] = [
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
];

export default function PractitionerSessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const autoJoinKeyRef = useRef<string | null>(null);

  const sessionQuery = usePractitionerSession(id ?? null);
  const prepareMutation = usePreparePractitionerSessionRuntime();
  const joinMutation = useResolvePractitionerSessionJoinContract();
  const completeMutation = useMarkPractitionerSessionCompleted();
  const noShowMutation = useMarkPractitionerSessionNoShow();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [joinContract, setJoinContract] =
    useState<PractitionerSessionJoinContract | null>(null);

  const session = sessionQuery.data?.item ?? null;

  const resolveJoinContract = async (sessionId: string) => {
    const payload = await joinMutation.mutateAsync(sessionId);
    setJoinContract(payload.item);
    return payload.item;
  };

  useEffect(() => {
    if (!session || !shouldAutoCheckJoin(session)) {
      autoJoinKeyRef.current = null;
      setJoinContract(null);
      return;
    }

    const nextKey = `${session.id}:${session.status}:${session.sessionMode}`;
    if (autoJoinKeyRef.current === nextKey) {
      return;
    }

    autoJoinKeyRef.current = nextKey;
    let active = true;

    resolveJoinContract(session.id).catch(() => {
      if (active) {
        setJoinContract(null);
      }
    });

    return () => {
      active = false;
    };
  }, [session?.id, session?.status, session?.sessionMode]);

  const sessionFacts = useMemo(() => {
    if (!session) {
      return [];
    }

    return [
      {
        label: t("practitioner.sessionDetail.sessionType"),
        value: getFlowTypeLabel(session.flowType, t),
      },
      {
        label: t("practitioner.sessionDetail.mode"),
        value: t(`practitioner.sessionDetail.modeValue.${session.sessionMode}`),
      },
      {
        label: t("practitioner.sessionDetail.duration"),
        value: t("practitioner.sessions.duration", {
          minutes: session.durationMinutes,
        }),
      },
      {
        label: t("practitioner.sessionDetail.timezone"),
        value: formatTimezoneLabel(session.timezone, i18n.language, t),
      },
    ];
  }, [i18n.language, session, t]);

  if (sessionQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header
          showBack
          onBack={() => router.back()}
          title={t("practitioner.sessionDetail.title")}
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
          onBack={() => router.back()}
          title={t("practitioner.sessionDetail.title")}
        />
        <ErrorState fullScreen onRetry={sessionQuery.refetch} />
      </Screen>
    );
  }

  const canComplete = COMPLETE_ALLOWED.includes(session.status);
  const canNoShow = NO_SHOW_ALLOWED.includes(session.status);
  const canPrepare = canShowPrepareAction(session, joinContract);
  const canCheckJoin = canShowJoinCheckAction(session, joinContract);
  const joinUrl = buildJoinUrl(joinContract);
  const currentState = getCurrentStateContent(session, joinContract, t);

  const handlePrepare = async () => {
    setFeedback(null);
    try {
      const payload = await prepareMutation.mutateAsync(session.id);
      setFeedback(
        payload.item.isPrepared
          ? t("practitioner.sessionDetail.prepareReady")
          : t("practitioner.sessionDetail.preparePending"),
      );
      if (shouldAutoCheckJoin(session)) {
        await resolveJoinContract(session.id).catch(() => {});
      }
    } catch {
      setFeedback(t("practitioner.sessionDetail.prepareError"));
    }
  };

  const handleCheckJoin = async () => {
    setFeedback(null);
    try {
      const contract = await resolveJoinContract(session.id);

      if (contract.canJoin && buildJoinUrl(contract)) {
        setFeedback(t("practitioner.sessionDetail.openRoomReady"));
        return;
      }

      setFeedback(
        t("practitioner.sessionDetail.joinBlocked", {
          reason: t(
            `practitioner.sessionDetail.blocked.${contract.blockedReason ?? "SESSION_NOT_JOINABLE_STATUS"}` as const,
          ),
        }),
      );
    } catch {
      setFeedback(t("practitioner.sessionDetail.joinError"));
    }
  };

  const handleOpenRoom = async () => {
    const nextUrl = joinUrl;
    if (!nextUrl) {
      return;
    }

    setFeedback(null);
    try {
      const safeJoinUrl = normalizeAllowedExternalUrl(nextUrl);
      if (!safeJoinUrl) {
        setFeedback(t("practitioner.sessionDetail.joinError"));
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
      setFeedback(t("practitioner.sessionDetail.openRoomError"));
    }
  };

  const handleComplete = async () => {
    setFeedback(null);
    try {
      await completeMutation.mutateAsync(session.id);
      setJoinContract(null);
      setFeedback(t("practitioner.sessionDetail.completedFeedback"));
      await sessionQuery.refetch();
    } catch {
      setFeedback(t("practitioner.sessionDetail.closeoutError"));
    }
  };

  const handleNoShow = async () => {
    setFeedback(null);
    try {
      await noShowMutation.mutateAsync(session.id);
      setJoinContract(null);
      setFeedback(t("practitioner.sessionDetail.noShowFeedback"));
      await sessionQuery.refetch();
    } catch {
      setFeedback(t("practitioner.sessionDetail.closeoutError"));
    }
  };

  return (
    <Screen bg="background">
      <Header
        showBack
        onBack={() => router.back()}
        title={t("practitioner.sessionDetail.title")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text weight="bold" style={styles.heroTitle}>
                {session.patient?.displayName ??
                  t("practitioner.sessions.unknownPatient")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.heroSubtitle}
              >
                {t("practitioner.sessionDetail.heroSubtitle", {
                  sessionCode: session.sessionCode,
                })}
              </Text>
            </View>
            <StatusBadge
              label={t(`practitioner.sessionStatus.${session.status}`)}
              status={mapSessionBadge(session.status)}
            />
          </View>

          <View style={styles.heroMetaStack}>
            <Text color={theme.colors.textSecondary} style={styles.heroMeta}>
              {session.scheduledStartAt
                ? t("practitioner.sessionDetail.sessionAt", {
                    datetime: formatSessionDate(
                      session.scheduledStartAt,
                      locale,
                    ),
                  })
                : t("practitioner.sessions.noSchedule")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.heroMeta}>
              {t("practitioner.sessionDetail.heroMode", {
                mode: t(
                  `practitioner.sessionDetail.modeValue.${session.sessionMode}`,
                ),
              })}
            </Text>
          </View>
        </Card>

        <Card variant="outlined" padding="lg" style={styles.sectionCard}>
          <Text weight="600" style={styles.sectionTitle}>
            {t("practitioner.sessionDetail.currentState")}
          </Text>
          <Text weight="600" style={styles.stateTitle}>
            {currentState.title}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.sectionBody}>
            {currentState.note}
          </Text>
          <View
            style={[
              styles.nextStepBox,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.eyebrow}>
              {t("practitioner.sessionDetail.nextStepLabel")}
            </Text>
            <Text weight="600" style={styles.nextStepValue}>
              {currentState.nextStep}
            </Text>
          </View>
          {joinContract?.blockedReason ? (
            <Text color={theme.colors.textSecondary} style={styles.helperText}>
              {t("practitioner.sessionDetail.joinBlocked", {
                reason: t(
                  `practitioner.sessionDetail.blocked.${joinContract.blockedReason}` as const,
                ),
              })}
            </Text>
          ) : null}
        </Card>

        <Card variant="outlined" padding="lg" style={styles.sectionCard}>
          <Text weight="600" style={styles.sectionTitle}>
            {t("practitioner.sessionDetail.actionsTitle")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.sectionBody}>
            {getActionSummary(session, joinContract, t)}
          </Text>

          {joinMutation.isPending ? (
            <Text color={theme.colors.textSecondary} style={styles.helperText}>
              {t("practitioner.sessionDetail.checkingJoin")}
            </Text>
          ) : null}

          {prepareMutation.isPending ? (
            <Text color={theme.colors.textSecondary} style={styles.helperText}>
              {t("practitioner.sessionDetail.preparing")}
            </Text>
          ) : null}

          <View style={styles.actionColumn}>
            {joinUrl ? (
              <Button
                title={t("practitioner.sessionDetail.openRoom")}
                onPress={() => void handleOpenRoom()}
              />
            ) : null}

            {canPrepare ? (
              <Button
                title={
                  prepareMutation.isPending
                    ? t("practitioner.sessionDetail.preparing")
                    : t("practitioner.sessionDetail.prepare")
                }
                onPress={() => void handlePrepare()}
                disabled={prepareMutation.isPending}
              />
            ) : null}

            {canCheckJoin && !joinUrl ? (
              <Button
                title={
                  joinMutation.isPending
                    ? t("practitioner.sessionDetail.checkingJoin")
                    : t("practitioner.sessionDetail.checkJoin")
                }
                variant="secondary"
                onPress={() => void handleCheckJoin()}
                disabled={joinMutation.isPending}
              />
            ) : null}

            {!joinUrl && !canPrepare && !canCheckJoin ? (
              <View
                style={[
                  styles.emptyActionBox,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text color={theme.colors.textSecondary}>
                  {t("practitioner.sessionDetail.noImmediateAction")}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.closeoutWrap}>
            <Text weight="600" style={styles.subsectionTitle}>
              {t("practitioner.sessionDetail.closeout")}
            </Text>
            {canComplete || canNoShow ? (
              <View style={styles.actionColumn}>
                {canComplete ? (
                  <Button
                    title={
                      completeMutation.isPending
                        ? t("practitioner.sessionDetail.completing")
                        : t("practitioner.sessionDetail.markCompleted")
                    }
                    onPress={() => void handleComplete()}
                    disabled={completeMutation.isPending}
                  />
                ) : null}
                {canNoShow ? (
                  <Button
                    title={
                      noShowMutation.isPending
                        ? t("practitioner.sessionDetail.markingNoShow")
                        : t("practitioner.sessionDetail.markNoShow")
                    }
                    variant="secondary"
                    onPress={() => void handleNoShow()}
                    disabled={noShowMutation.isPending}
                  />
                ) : null}
              </View>
            ) : (
              <Text
                color={theme.colors.textSecondary}
                style={styles.helperText}
              >
                {getCloseoutSummary(session, t)}
              </Text>
            )}
          </View>
        </Card>

        <Card variant="outlined" padding="lg" style={styles.sectionCard}>
          <Text weight="600" style={styles.sectionTitle}>
            {t("practitioner.sessionDetail.sessionFacts")}
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

  return (
    <View
      style={[
        styles.summaryRow,
        {
          borderBottomColor: theme.colors.borderLight,
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
    >
      <Text color={theme.colors.textMuted}>{label}</Text>
      <Text weight="600" style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function shouldAutoCheckJoin(session: PractitionerSessionDetails) {
  return (
    session.sessionMode === "VIDEO" &&
    RUNTIME_CHECKABLE.includes(session.status)
  );
}

function canShowPrepareAction(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
) {
  if (session.sessionMode !== "VIDEO") {
    return false;
  }

  if (!PREPARE_ELIGIBLE.includes(session.status)) {
    return false;
  }

  if (joinContract?.canJoin) {
    return false;
  }

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
  if (session.sessionMode !== "VIDEO") {
    return false;
  }

  if (!RUNTIME_CHECKABLE.includes(session.status)) {
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
    return t("practitioner.sessionDetail.flowTypeValue.SCHEDULED");
  }

  if (flowType === "INSTANT") {
    return t("practitioner.sessionDetail.flowTypeValue.INSTANT");
  }

  return t("practitioner.sessionDetail.flowTypeValue.DEFAULT");
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

  return t("practitioner.sessionDetail.timezoneValue", {
    city: cityMap[cityToken as keyof typeof cityMap] ?? cityToken,
  });
}

function getCurrentStateContent(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const statusLabel = t(`practitioner.sessionStatus.${session.status}`);

  switch (session.status) {
    case "PENDING_PAYMENT":
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.PENDING_PAYMENT"),
        nextStep: t("practitioner.sessionDetail.nextStep.waitForPayment"),
      };
    case "PENDING_PRACTITIONER_RESPONSE":
      return {
        title: statusLabel,
        note: t(
          "practitioner.sessionDetail.stateNote.PENDING_PRACTITIONER_RESPONSE",
        ),
        nextStep: t("practitioner.sessionDetail.nextStep.waitForConfirmation"),
      };
    case "CONFIRMED":
    case "UPCOMING":
      return {
        title: statusLabel,
        note:
          joinContract?.blockedReason === "SESSION_RUNTIME_NOT_PREPARED"
            ? t("practitioner.sessionDetail.stateNote.UPCOMING_NEEDS_PREPARE")
            : t("practitioner.sessionDetail.stateNote.UPCOMING"),
        nextStep:
          joinContract?.blockedReason === "SESSION_RUNTIME_NOT_PREPARED"
            ? t("practitioner.sessionDetail.nextStep.prepareRoom")
            : t("practitioner.sessionDetail.nextStep.waitForWindow"),
      };
    case "READY_TO_JOIN":
      return {
        title: statusLabel,
        note: joinContract?.canJoin
          ? t("practitioner.sessionDetail.stateNote.READY_TO_JOIN_NOW")
          : joinContract?.blockedReason === "SESSION_RUNTIME_NOT_PREPARED"
            ? t("practitioner.sessionDetail.stateNote.READY_TO_JOIN_PREPARE")
            : t("practitioner.sessionDetail.stateNote.READY_TO_JOIN_CHECK"),
        nextStep: joinContract?.canJoin
          ? t("practitioner.sessionDetail.nextStep.openRoom")
          : joinContract?.blockedReason === "SESSION_RUNTIME_NOT_PREPARED"
            ? t("practitioner.sessionDetail.nextStep.prepareRoom")
            : t("practitioner.sessionDetail.nextStep.checkJoin"),
      };
    case "IN_PROGRESS":
      return {
        title: statusLabel,
        note: joinContract?.canJoin
          ? t("practitioner.sessionDetail.stateNote.IN_PROGRESS_OPEN")
          : t("practitioner.sessionDetail.stateNote.IN_PROGRESS"),
        nextStep: joinContract?.canJoin
          ? t("practitioner.sessionDetail.nextStep.openRoom")
          : t("practitioner.sessionDetail.nextStep.checkJoin"),
      };
    case "COMPLETED":
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.COMPLETED"),
        nextStep: t("practitioner.sessionDetail.nextStep.reviewOnly"),
      };
    case "NO_SHOW":
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.NO_SHOW"),
        nextStep: t("practitioner.sessionDetail.nextStep.reviewOnly"),
      };
    case "CANCELLED":
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.CANCELLED"),
        nextStep: t("practitioner.sessionDetail.nextStep.reviewOnly"),
      };
    case "EXPIRED":
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.EXPIRED"),
        nextStep: t("practitioner.sessionDetail.nextStep.reviewOnly"),
      };
    case "REFUND_PENDING":
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.REFUND_PENDING"),
        nextStep: t("practitioner.sessionDetail.nextStep.reviewOnly"),
      };
    case "REFUNDED":
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.REFUNDED"),
        nextStep: t("practitioner.sessionDetail.nextStep.reviewOnly"),
      };
    default:
      return {
        title: statusLabel,
        note: t("practitioner.sessionDetail.stateNote.DEFAULT"),
        nextStep: t("practitioner.sessionDetail.nextStep.reviewOnly"),
      };
  }
}

function getActionSummary(
  session: PractitionerSessionDetails,
  joinContract: PractitionerSessionJoinContract | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (joinContract?.canJoin) {
    return t("practitioner.sessionDetail.actionSummary.openRoom");
  }

  if (canShowPrepareAction(session, joinContract)) {
    return t("practitioner.sessionDetail.actionSummary.prepareRoom");
  }

  if (canShowJoinCheckAction(session, joinContract)) {
    return t("practitioner.sessionDetail.actionSummary.checkJoin");
  }

  if (
    COMPLETE_ALLOWED.includes(session.status) ||
    NO_SHOW_ALLOWED.includes(session.status)
  ) {
    return t("practitioner.sessionDetail.actionSummary.closeout");
  }

  return t("practitioner.sessionDetail.actionSummary.none");
}

function getCloseoutSummary(
  session: PractitionerSessionDetails,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  switch (session.status) {
    case "COMPLETED":
      return t("practitioner.sessionDetail.closeoutSummary.COMPLETED");
    case "NO_SHOW":
      return t("practitioner.sessionDetail.closeoutSummary.NO_SHOW");
    case "CANCELLED":
    case "EXPIRED":
    case "REFUND_PENDING":
    case "REFUNDED":
      return t("practitioner.sessionDetail.closeoutSummary.CLOSED");
    default:
      return t("practitioner.sessionDetail.closeoutSummary.NOT_READY");
  }
}

function mapSessionBadge(status: SessionStatus) {
  switch (status) {
    case "READY_TO_JOIN":
    case "IN_PROGRESS":
      return "success" as const;
    case "UPCOMING":
    case "CONFIRMED":
    case "PENDING_PRACTITIONER_RESPONSE":
      return "warning" as const;
    case "NO_SHOW":
    case "CANCELLED":
    case "EXPIRED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  heroCard: {
    gap: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
  },
  heroMetaStack: {
    gap: 4,
  },
  heroMeta: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
  },
  subsectionTitle: {
    fontSize: 16,
  },
  stateTitle: {
    fontSize: 16,
  },
  sectionBody: {
    lineHeight: 22,
  },
  nextStepBox: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
  },
  nextStepValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    lineHeight: 22,
  },
  actionColumn: {
    gap: 10,
  },
  emptyActionBox: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  closeoutWrap: {
    marginTop: 6,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  summaryValue: {
    flex: 1,
    textAlign: "right",
  },
});
