import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMyPresence } from "../../practitioner/presence/hooks";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../../components/ui";
import { useTheme } from "../../../providers/ThemeProvider";
import {
  useAcceptInstantBookingRequest,
  useNowTick,
  usePractitionerInstantBookingRequests,
  usePractitionerPendingBookingRequests,
  useRejectInstantBookingRequest,
} from "../hooks";
import type { InstantBookingRequest } from "../types";
import {
  formatInstantBookingDateTime,
  formatInstantBookingExpiry,
} from "../lib/format";
import { getPractitionerInstantBookingErrorKey } from "../lib/instant-booking-errors";

function requestTone(status: InstantBookingRequest["status"]) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "ACCEPTED":
      return "success" as const;
    case "REJECTED":
    case "EXPIRED":
    case "CANCELLED":
    default:
      return "default" as const;
  }
}

function getPatientInitials(displayName: string | null | undefined) {
  const clean = displayName?.trim() ?? "";
  if (!clean) {
    return "PA";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function RequestCard({
  request,
  locale,
  nowMs,
  acceptingRequestId,
  rejectingRequestId,
  actionError,
  onAccept,
  onReject,
}: {
  request: InstantBookingRequest;
  locale: string;
  nowMs: number;
  acceptingRequestId: string | null;
  rejectingRequestId: string | null;
  actionError: string | null;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isArabic = locale.startsWith("ar");
  const patientLabel = request.patient?.displayName?.trim() || t("instantBooking.practitioner.request.unknownPatient");
  const initials = getPatientInitials(request.patient?.displayName);
  const durationLabel = t("instantBooking.practitioner.request.duration", {
    minutes: request.requestedDurationMinutes,
  });
  const modeLabel = t(`instantBooking.modes.${request.sessionMode}` as const);
  const expiresLabel = formatInstantBookingExpiry(request.expiresAt, locale, nowMs);
  const statusLabel = t(`instantBooking.statuses.${request.status}` as const);
  const tone = requestTone(request.status);
  const isPending = request.status === "PENDING";

  const cardColors =
    request.status === "PENDING"
      ? {
          border: theme.colors.warningLight,
          background: theme.colors.warningLight,
        }
      : request.status === "ACCEPTED"
        ? {
            border: theme.colors.successLight,
            background: theme.colors.successLight,
          }
        : {
            border: theme.colors.borderLight,
            background: theme.colors.surfaceSecondary,
          };

  return (
    <Card
      variant="elevated"
      padding="sm"
      style={[
        styles.card,
        {
          borderColor: cardColors.border,
          backgroundColor: cardColors.background,
        },
      ]}
    >
      <View style={[styles.topRow, isArabic ? styles.rowReverse : styles.row]}>
        <View style={styles.avatarWrap}>
          {request.patient?.displayName ? (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primaryLight }]}>
              <Text weight="700" color={theme.colors.primary}>
                {initials}
              </Text>
            </View>
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="person" size={22} color={theme.colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.identityWrap}>
          <View style={styles.identityTopRow}>
            <View style={styles.identityTextWrap}>
              <Text weight="600" style={styles.title} numberOfLines={1}>
                {patientLabel}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.subtitle} numberOfLines={1}>
                {t("instantBooking.practitioner.request.detailsLine", {
                  duration: durationLabel,
                  mode: modeLabel,
                })}
              </Text>
            </View>
            <StatusBadge label={statusLabel} status={tone} />
          </View>

          <View style={styles.metaRow}>
            <StatusBadge
              label={t("instantBooking.practitioner.request.fields.expiresAt")}
              status="default"
            />
            <StatusBadge label={formatInstantBookingDateTime(request.requestedAt, locale)} status="info" />
            {request.responseReason ? (
              <StatusBadge
                label={t("instantBooking.practitioner.request.hasReason")}
                status="warning"
              />
            ) : null}
          </View>
        </View>
      </View>

      <View style={[styles.timelineCard, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]}>
        <View style={styles.timelineRow}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text color={theme.colors.textSecondary} style={styles.timelineText}>
            {formatInstantBookingDateTime(request.expiresAt, locale)}
          </Text>
        </View>
        <View style={styles.timelineRow}>
          <Ionicons name="flash-outline" size={14} color={theme.colors.textSecondary} />
          <Text color={theme.colors.textSecondary} style={styles.timelineText}>
            {expiresLabel}
          </Text>
        </View>
      </View>

      {request.responseReason ? (
        <View style={[styles.responseReason, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.textSecondary} />
          <Text color={theme.colors.textSecondary} style={styles.responseReasonText}>
            {request.responseReason}
          </Text>
        </View>
      ) : null}

      {actionError ? (
        <View style={[styles.responseReason, { borderColor: theme.colors.errorLight, backgroundColor: theme.colors.errorLight }]}>
          <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
          <Text color={theme.colors.error} style={styles.responseReasonText}>
            {actionError}
          </Text>
        </View>
      ) : null}

      {isPending ? (
        <View style={styles.actionsRow}>
          <Button
            title={t("instantBooking.practitioner.request.acceptAction")}
            onPress={() => onAccept(request.id)}
            loading={acceptingRequestId === request.id}
            style={styles.actionButton}
          />
          <Button
            title={t("instantBooking.practitioner.request.rejectAction")}
            variant="secondary"
            onPress={() => onReject(request.id)}
            loading={rejectingRequestId === request.id}
            style={styles.actionButton}
          />
        </View>
      ) : null}
    </Card>
  );
}

function RequestSection({
  title,
  subtitle,
  requests,
  locale,
  nowMs,
  acceptingRequestId,
  rejectingRequestId,
  actionErrors,
  onAccept,
  onReject,
}: {
  title: string;
  subtitle?: string;
  requests: InstantBookingRequest[];
  locale: string;
  nowMs: number;
  acceptingRequestId: string | null;
  rejectingRequestId: string | null;
  actionErrors: Record<string, string>;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  const { theme } = useTheme();

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" padding="sm" style={styles.sectionCard}>
      <Text weight="600" style={styles.sectionTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text color={theme.colors.textSecondary} style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      ) : null}

      <View style={styles.requestList}>
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            locale={locale}
            nowMs={nowMs}
            acceptingRequestId={acceptingRequestId}
            rejectingRequestId={rejectingRequestId}
            actionError={actionErrors[request.id] ?? null}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </View>
    </Card>
  );
}

export default function PractitionerInstantBookingRequestsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const nowMs = useNowTick(1_000);
  const requestsQuery = usePractitionerInstantBookingRequests();
  const pendingQuery = usePractitionerPendingBookingRequests();
  const acceptMutation = useAcceptInstantBookingRequest();
  const rejectMutation = useRejectInstantBookingRequest();
  const presenceQuery = useMyPresence();
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const { theme } = useTheme();
  const requests = useMemo(() => requestsQuery.data?.items ?? [], [requestsQuery.data?.items]);
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "PENDING"),
    [requests],
  );
  const handledRequests = useMemo(
    () => requests.filter((request) => request.status !== "PENDING"),
    [requests],
  );
  const nearestExpiry = useMemo(() => {
    if (pendingRequests.length === 0) {
      return null;
    }

    return [...pendingRequests].sort(
      (left, right) => new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
    )[0];
  }, [pendingRequests]);

  useEffect(() => {
    if (!pageMessage) {
      return;
    }

    const timer = setTimeout(() => setPageMessage(null), 5_000);
    return () => clearTimeout(timer);
  }, [pageMessage]);

  const handleAccept = async (requestId: string) => {
    setPageMessage(null);
    setActionErrors((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });

    try {
      await acceptMutation.mutateAsync(requestId);
      setPageMessage(t("instantBooking.practitioner.feedback.accepted"));
      await requestsQuery.refetch();
      await pendingQuery.refetch();
    } catch (error) {
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(getPractitionerInstantBookingErrorKey(error) as never),
      }));
      await requestsQuery.refetch();
      await pendingQuery.refetch();
    }
  };

  const handleReject = async (requestId: string) => {
    setPageMessage(null);
    setActionErrors((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });

    try {
      await rejectMutation.mutateAsync({ requestId });
      setPageMessage(t("instantBooking.practitioner.feedback.rejected"));
      await requestsQuery.refetch();
      await pendingQuery.refetch();
    } catch (error) {
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(getPractitionerInstantBookingErrorKey(error) as never),
      }));
      await requestsQuery.refetch();
      await pendingQuery.refetch();
    }
  };

  if (requestsQuery.isLoading || pendingQuery.isLoading || presenceQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header title={t("instantBooking.practitioner.queue.title")} />
        <LoadingState fullScreen message={t("instantBooking.practitioner.errors.loadingHeading")} />
      </Screen>
    );
  }

  if (requestsQuery.isError || pendingQuery.isError) {
    return (
      <Screen bg="background">
        <Header title={t("instantBooking.practitioner.queue.title")} />
        <ErrorState
          fullScreen
          onRetry={() => {
            void requestsQuery.refetch();
            void pendingQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header title={t("instantBooking.practitioner.queue.title")} />

      <View style={styles.root}>
        <Card
          variant="outlined"
          padding="sm"
          style={[
            styles.summaryCard,
            {
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View style={styles.summaryTop}>
            <View style={styles.summaryTextWrap}>
              <Text weight="700" style={styles.summaryTitle}>
                {t("instantBooking.practitioner.queue.eyebrow")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.summarySubtitle}>
                {t("instantBooking.practitioner.queue.subtitle")}
              </Text>
            </View>
            <StatusBadge
              label={
                presenceQuery.data?.presence?.isInstantBookingEnabled
                  ? t("instantBooking.practitioner.queue.enabled")
                  : t("instantBooking.practitioner.queue.disabled")
              }
              status={presenceQuery.data?.presence?.isInstantBookingEnabled ? "success" : "warning"}
            />
          </View>

          <View style={[styles.summaryGrid, isCompact && styles.summaryGridCompact]}>
            <SummaryBlock
              label={t("instantBooking.practitioner.queue.summary.pendingCount")}
              value={String(pendingRequests.length)}
              tone="warning"
              compact={isCompact}
            />
            <SummaryBlock
              label={t("instantBooking.practitioner.queue.summary.nearestExpiry")}
              value={nearestExpiry ? formatInstantBookingExpiry(nearestExpiry.expiresAt, locale, nowMs) : t("instantBooking.practitioner.queue.summary.noPending")}
              tone="default"
              compact={isCompact}
            />
            <SummaryBlock
              label={t("instantBooking.practitioner.queue.summary.liveHintTitle")}
              value={t("instantBooking.practitioner.queue.summary.liveHint")}
              tone="info"
              compact={isCompact}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.push("/(practitioner)/availability" as never)}
            style={[styles.summaryAction, { borderColor: theme.colors.borderLight }]}
          >
            <Ionicons name="pulse-outline" size={16} color={theme.colors.primary} />
            <Text weight="600" color={theme.colors.primary} style={styles.summaryActionText}>
              {t("instantBooking.practitioner.queue.openAvailability")}
            </Text>
          </TouchableOpacity>
        </Card>

        {pageMessage ? (
          <Card
            variant="outlined"
            padding="sm"
            style={[
              styles.feedbackCard,
              {
                borderColor: theme.colors.successLight,
                backgroundColor: theme.colors.successLight,
              },
            ]}
          >
            <View style={styles.feedbackRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
              <Text weight="600" color={theme.colors.success}>
                {pageMessage}
              </Text>
            </View>
          </Card>
        ) : null}

        {requests.length === 0 ? (
          <EmptyState
            title={t("instantBooking.practitioner.empty.title")}
            description={t("instantBooking.practitioner.empty.note")}
            icon={<Ionicons name="flash-outline" size={44} color={theme.colors.textMuted} />}
          />
        ) : (
          <View style={styles.sections}>
            <RequestSection
              title={t("instantBooking.practitioner.queue.pendingHeading")}
              subtitle={t("instantBooking.practitioner.queue.pendingNote")}
              requests={pendingRequests}
              locale={locale}
              nowMs={nowMs}
              acceptingRequestId={acceptMutation.isPending ? acceptMutation.variables ?? null : null}
              rejectingRequestId={rejectMutation.isPending ? rejectMutation.variables?.requestId ?? null : null}
              actionErrors={actionErrors}
              onAccept={handleAccept}
              onReject={handleReject}
            />

            <RequestSection
              title={t("instantBooking.practitioner.queue.handledHeading")}
              subtitle={t("instantBooking.practitioner.queue.handledNote")}
              requests={handledRequests}
              locale={locale}
              nowMs={nowMs}
              acceptingRequestId={acceptMutation.isPending ? acceptMutation.variables ?? null : null}
              rejectingRequestId={rejectMutation.isPending ? rejectMutation.variables?.requestId ?? null : null}
              actionErrors={actionErrors}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

function SummaryBlock({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone: "warning" | "default" | "info";
  compact: boolean;
}) {
  const { theme } = useTheme();
  const colors =
    tone === "warning"
      ? {
          backgroundColor: theme.colors.warningLight,
          borderColor: theme.colors.warningLight,
          valueColor: theme.colors.warning,
        }
      : tone === "info"
        ? {
            backgroundColor: theme.colors.primaryLight,
            borderColor: theme.colors.primaryLight,
            valueColor: theme.colors.primary,
          }
        : {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.borderLight,
            valueColor: theme.colors.textPrimary,
          };

  return (
    <View
      style={[
        styles.summaryBlock,
        compact && styles.summaryBlockCompact,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <Text color={theme.colors.textMuted} style={styles.summaryBlockLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text weight="600" color={colors.valueColor} style={styles.summaryBlockValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  summaryCard: {
    gap: 10,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  summarySubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  summaryGrid: {
    gap: 6,
  },
  summaryGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryBlock: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  summaryBlockCompact: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  summaryBlockLabel: {
    fontSize: 11,
    lineHeight: 15,
  },
  summaryBlockValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  summaryAction: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryActionText: {
    fontSize: 12,
  },
  feedbackCard: {
    gap: 0,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sections: {
    gap: 10,
  },
  sectionCard: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  requestList: {
    gap: 8,
  },
  card: {
    gap: 10,
  },
  topRow: {
    alignItems: "flex-start",
    gap: 10,
  },
  row: {
    flexDirection: "row",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  identityWrap: {
    flex: 1,
    gap: 6,
  },
  identityTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  identityTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  timelineCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timelineText: {
    fontSize: 11,
    lineHeight: 16,
  },
  responseReason: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  responseReasonText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  actionsRow: {
    gap: 6,
  },
  actionButton: {
    width: "100%",
  },
  requestCard: {
    gap: 10,
  },
});
