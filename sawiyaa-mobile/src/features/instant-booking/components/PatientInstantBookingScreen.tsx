import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  useWindowDimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePatientProfile } from "../../patient/profile/hooks";
import { resolveSupportedCurrencyCode } from "../../../lib/currency";
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
  useCancelPatientInstantBookingRequest,
  useCreatePatientInstantBookingRequest,
  useNowTick,
  usePatientInstantBookingPractitioners,
  usePatientInstantBookingRequest,
  usePatientInstantBookingRequests,
} from "../hooks";
import type {
  InstantBookingDiscoveryCurrency,
  InstantBookingDiscoveryDuration,
  InstantBookingEligiblePractitionerItem,
  InstantBookingRequest,
  InstantBookingSessionMode,
} from "../types";
import {
  formatInstantBookingExpiry,
  formatInstantBookingMoney,
  formatInstantBookingTime,
} from "../lib/format";
import {
  getPatientInstantBookingErrorKey,
  readInstantBookingErrorCode,
} from "../lib/instant-booking-errors";

const DEFAULT_VISIBLE_RESULTS = 30;
const DEFAULT_SESSION_MODE: InstantBookingSessionMode = "VIDEO";

function getPractitionerInitials(displayName: string | null | undefined) {
  const clean = displayName?.trim() ?? "";
  if (!clean) {
    return "IB";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getPrice(
  practitioner: InstantBookingEligiblePractitionerItem,
  currency: InstantBookingDiscoveryCurrency,
  minutes: InstantBookingDiscoveryDuration,
) {
  return practitioner.instantBookingPricing?.[currency]?.[minutes] ?? null;
}

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

function PractitionerInstantBookingCard({
  practitioner,
  currency,
  locale,
  numLocale,
  onBook,
  pendingSelectionKey,
  createPending,
  compact,
}: {
  practitioner: InstantBookingEligiblePractitionerItem;
  currency: InstantBookingDiscoveryCurrency;
  locale: string;
  numLocale: string;
  onBook: (slug: string, duration: InstantBookingDiscoveryDuration) => void;
  pendingSelectionKey: string | null;
  createPending: boolean;
  compact: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isArabic = locale.startsWith("ar");
  const displayName = practitioner.displayName?.trim() || practitioner.slug;
  const title = practitioner.title?.trim() || "";
  const specialty = practitioner.primarySpecialty?.trim() || "";
  const initials = getPractitionerInitials(displayName);
  const cardBusy = createPending && pendingSelectionKey?.startsWith(practitioner.slug);
  const hasAvatar = Boolean(practitioner.avatarUrl?.trim());
  const endLabel = formatInstantBookingTime(practitioner.currentWindowEndsAt, numLocale);
  const rating =
    typeof practitioner.rating === "number" && Number.isFinite(practitioner.rating)
      ? practitioner.rating.toFixed(1)
      : null;
  const completedSessions =
    typeof practitioner.completedSessionsCount === "number"
      ? new Intl.NumberFormat(numLocale).format(practitioner.completedSessionsCount)
      : null;

  return (
    <Card
      variant="elevated"
      padding="sm"
      style={[
        styles.practitionerCard,
        compact && styles.practitionerCardCompact,
        {
          borderColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <View style={[styles.practitionerHeader, isArabic ? styles.rowReverse : styles.row]}>
        <View style={styles.avatarWrap}>
          {hasAvatar ? (
            <Image
              source={{ uri: practitioner.avatarUrl!.trim() }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primaryLight }]}>
              <Text weight="700" color={theme.colors.primary}>
                {initials}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.identityWrap}>
          <View style={styles.identityTopRow}>
            <View style={styles.identityTextWrap}>
              <Text
                weight="600"
                style={[styles.identityTitle, compact && styles.identityTitleCompact]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.identitySubtitle} numberOfLines={1}>
                {[title, specialty].filter(Boolean).join(" · ") || t("instantBooking.patient.card.bioFallback")}
              </Text>
            </View>
            <StatusBadge
              label={t("instantBooking.patient.card.availableNow")}
              status="success"
            />
          </View>

          <View style={styles.metaRow}>
            <StatusBadge
              label={t("instantBooking.patient.card.until", { value: endLabel })}
              status="default"
            />
            {rating ? (
              <StatusBadge
                label={t("instantBooking.patient.card.rating", { value: rating })}
                status="info"
              />
            ) : null}
            {completedSessions ? (
              <StatusBadge
                label={t("instantBooking.patient.card.completedSessions", {
                  count:
                    typeof practitioner.completedSessionsCount === "number"
                      ? practitioner.completedSessionsCount
                      : 0,
                })}
                status="default"
              />
            ) : null}
          </View>

          {practitioner.shortBio ? (
            <Text color={theme.colors.textSecondary} style={styles.bio} numberOfLines={1}>
              {practitioner.shortBio}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.durationSection,
          compact && styles.durationSectionCompact,
          { backgroundColor: theme.colors.surfaceSecondary },
        ]}
      >
        <View style={styles.durationSectionHeader}>
          <Ionicons name="flash-outline" size={14} color={theme.colors.primary} />
          <Text weight="600" style={styles.durationSectionTitle} color={theme.colors.textPrimary}>
            {t("instantBooking.patient.card.selectDuration")}
          </Text>
        </View>

        <View style={[styles.durationGrid, compact && styles.durationGridCompact]}>
          {practitioner.supportedDurations.map((duration) => {
            const price = getPrice(practitioner, currency, duration);
            if (!price) {
              return null;
            }

            const isPending =
              cardBusy && pendingSelectionKey === `${practitioner.slug}:${duration}`;

            return (
              <TouchableOpacity
                key={duration}
                activeOpacity={0.84}
                style={[
                  styles.durationButton,
                  compact && styles.durationButtonCompact,
                  {
                    borderColor: theme.colors.borderLight,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                disabled={createPending}
                onPress={() => onBook(practitioner.slug, duration)}
              >
                <View style={styles.durationButtonRow}>
                  <Text weight="600" style={styles.durationButtonTitle}>
                    {t("instantBooking.patient.card.durationLabel", { minutes: duration })}
                  </Text>
                  {isPending ? (
                    <Ionicons name="reload" size={14} color={theme.colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                  )}
                </View>
                <Text weight="700" style={styles.durationButtonPrice} color={theme.colors.primary}>
                  {formatInstantBookingMoney(price, currency, numLocale)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

function InstantBookingRequestCard({
  request,
  locale,
  nowMs,
  onReset,
  onPay,
  onCancel,
  cancelPending,
}: {
  request: InstantBookingRequest;
  locale: string;
  nowMs: number;
  onReset: () => void;
  onPay: () => void;
  onCancel: () => void;
  cancelPending: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const statusLabel = t(`instantBooking.statuses.${request.status}` as const);
  const practitionerLabel =
    request.practitioner.displayName?.trim() || request.practitioner.slug;
  const durationLabel = t("instantBooking.patient.request.duration", {
    minutes: request.requestedDurationMinutes,
  });
  const modeLabel = t(`instantBooking.modes.${request.sessionMode}` as const);
  const expiresLabel = formatInstantBookingExpiry(request.expiresAt, locale, nowMs);
  const tone = requestTone(request.status);

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
        styles.requestCard,
        {
          borderColor: cardColors.border,
          backgroundColor: cardColors.background,
        },
      ]}
    >
      <View style={styles.requestTopRow}>
        <View style={styles.requestIdentity}>
          <Text weight="600" style={styles.requestTitle}>
            {t(`instantBooking.patient.request.titles.${request.status}` as const)}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.requestSubtitle}>
            {t(`instantBooking.patient.request.notes.${request.status}` as const)}
          </Text>
        </View>
        <StatusBadge label={statusLabel} status={tone} />
      </View>

      <View style={styles.requestMetaGrid}>
        <SummaryChip
          label={t("instantBooking.patient.request.fields.practitioner")}
          value={practitionerLabel}
        />
        <SummaryChip
          label={t("instantBooking.patient.request.fields.duration")}
          value={durationLabel}
        />
        <SummaryChip
          label={t("instantBooking.patient.request.fields.sessionMode")}
          value={modeLabel}
        />
        <SummaryChip
          label={t("instantBooking.patient.request.fields.expiresAt")}
          value={expiresLabel}
        />
      </View>

      {request.responseReason ? (
        <View style={[styles.responseReason, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surface }]}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text color={theme.colors.textSecondary} style={styles.responseReasonText}>
            {request.responseReason}
          </Text>
        </View>
      ) : null}

      <View style={styles.requestActions}>
        {request.status === "PENDING" ? (
          <Button
            title={t("instantBooking.patient.request.cancelAction")}
            variant="secondary"
            onPress={onCancel}
            loading={cancelPending}
            style={styles.requestActionButton}
          />
        ) : null}

        {request.status === "ACCEPTED" && request.createdSessionId ? (
          <Button
            title={t("instantBooking.patient.request.payAction")}
            onPress={onPay}
            style={styles.requestActionButton}
          />
        ) : null}

        {request.status !== "PENDING" ? (
          <Button
            title={t("instantBooking.patient.request.resetAction")}
            variant="secondary"
            onPress={onReset}
            style={styles.requestActionButton}
          />
        ) : null}
      </View>
    </Card>
  );
}

function SummaryChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.summaryChip,
        {
          borderColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <Text color={theme.colors.textMuted} style={styles.summaryChipLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text weight="600" style={styles.summaryChipValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function PatientInstantBookingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 420;
  const nowMs = useNowTick(1_000);
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const requestIdFromUrl = firstParam(params.requestId);

  const patientProfileQuery = usePatientProfile();
  const currencyCode = useMemo(
    () =>
      resolveSupportedCurrencyCode({
        countryCode: patientProfileQuery.data?.profile.countryCode ?? null,
      }),
    [patientProfileQuery.data?.profile.countryCode],
  );

  const practitionersQuery = usePatientInstantBookingPractitioners({
    page: 1,
    limit: DEFAULT_VISIBLE_RESULTS,
    currency: currencyCode,
  });
  const requestsQuery = usePatientInstantBookingRequests();
  const latestActiveRequest = useMemo(() => {
    const requests = requestsQuery.data?.items ?? [];
    return (
      requests.find((request) => request.status === "PENDING" || request.status === "ACCEPTED") ??
      null
    );
  }, [requestsQuery.data?.items]);

  const activeRequestId = requestIdFromUrl ?? latestActiveRequest?.id ?? null;
  const activeRequestQuery = usePatientInstantBookingRequest(activeRequestId);
  const activeRequest = activeRequestQuery.data?.item ?? latestActiveRequest;
  const requestIsTerminal =
    activeRequest &&
    activeRequest.status !== "PENDING" &&
    activeRequest.status !== "ACCEPTED";

  const createMutation = useCreatePatientInstantBookingRequest();
  const cancelMutation = useCancelPatientInstantBookingRequest();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    setPageError(null);
  }, [locale, activeRequestId, currencyCode]);

  const navigateWithRequestId = (nextRequestId: string | null) => {
    const nextParams = new URLSearchParams();
    if (nextRequestId) {
      nextParams.set("requestId", nextRequestId);
    }

    router.replace(
      nextRequestId
        ? (`/(patient)/instant-booking?${nextParams.toString()}` as never)
        : ("/(patient)/instant-booking" as never),
    );
  };

  const handleBook = async (
    practitionerSlug: string,
    durationMinutes: InstantBookingDiscoveryDuration,
  ) => {
    setPageError(null);

    try {
      const request = await createMutation.mutateAsync({
        practitionerSlug,
        durationMinutes,
        sessionMode: DEFAULT_SESSION_MODE,
      });
      navigateWithRequestId(request.item.id);
    } catch (error) {
      const errorCode = readInstantBookingErrorCode(error);
      if (errorCode === "INSTANT_BOOKING_PENDING_REQUEST_ALREADY_EXISTS" && latestActiveRequest) {
        navigateWithRequestId(latestActiveRequest.id);
        return;
      }

      setPageError(t(getPatientInstantBookingErrorKey(error) as never));
    }
  };

  const handleCancel = async () => {
    if (!activeRequest) {
      return;
    }

    setPageError(null);
    try {
      await cancelMutation.mutateAsync({ requestId: activeRequest.id });
      navigateWithRequestId(null);
    } catch (error) {
      setPageError(t("instantBooking.patient.errors.cancelFailed"));
    }
  };

  const showBrowseState = !activeRequest || requestIsTerminal;
  const isBrowseLoading =
    practitionersQuery.isLoading || patientProfileQuery.isLoading || requestsQuery.isLoading;
  const requestStateCard =
    activeRequest && !requestIsTerminal ? (
      <InstantBookingRequestCard
        request={activeRequest}
        locale={locale}
        nowMs={nowMs}
        onReset={() => navigateWithRequestId(null)}
        onPay={() => {
          if (!activeRequest.createdSessionId) {
            return;
          }

          router.push(`/(patient)/sessions/${activeRequest.createdSessionId}/pay` as never);
        }}
        onCancel={handleCancel}
        cancelPending={cancelMutation.isPending}
      />
    ) : null;

  return (
    <Screen bg="background">
      <Header title={t("instantBooking.patient.hero.title")} />

      <FlatList
        data={showBrowseState ? practitionersQuery.data?.items ?? [] : []}
        keyExtractor={(item) => item.practitionerId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <Card
              variant="outlined"
              padding="sm"
              style={[
                styles.heroCard,
                {
                  borderColor: theme.colors.borderLight,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroTextWrap}>
                  <Text
                    variant="caption"
                    weight="700"
                    color={theme.colors.primary}
                    style={styles.eyebrow}
                  >
                    {t("instantBooking.patient.hero.eyebrow")}
                  </Text>
                  <Text
                    weight="700"
                    style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}
                  >
                    {t("instantBooking.patient.hero.title")}
                  </Text>
                  <Text
                    color={theme.colors.textSecondary}
                    style={[styles.heroNote, isCompact && styles.heroNoteCompact]}
                  >
                    {t("instantBooking.patient.hero.note")}
                  </Text>
                </View>
                <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name="flash-outline" size={18} color={theme.colors.primary} />
                </View>
              </View>

              <View style={styles.heroChips}>
                <StatusBadge label={t("instantBooking.patient.hero.chips.onlineNow")} status="success" />
                <StatusBadge label={t("instantBooking.patient.hero.chips.durationOptions")} status="info" />
                <StatusBadge label={t("instantBooking.patient.hero.chips.backendPricing")} status="default" />
              </View>
            </Card>

            {pageError ? (
              <Card
                variant="outlined"
                padding="sm"
                style={[
                  styles.errorCard,
                  {
                    borderColor: theme.colors.errorLight,
                    backgroundColor: theme.colors.errorLight,
                  },
                ]}
              >
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
                  <View style={styles.errorTextWrap}>
                    <Text weight="600" style={styles.errorTitle} color={theme.colors.error}>
                      {t("instantBooking.patient.errors.genericHeading")}
                    </Text>
                    <Text color={theme.colors.error} style={styles.errorNote}>
                      {pageError}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {activeRequest && !requestIsTerminal ? requestStateCard : null}

            {activeRequest && requestIsTerminal ? (
              <Card
                variant="outlined"
                padding="sm"
                style={[
                  styles.archivedCard,
                  {
                    borderColor: theme.colors.borderLight,
                    backgroundColor: theme.colors.surfaceSecondary,
                  },
                ]}
              >
                <View style={styles.errorRow}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                  <View style={styles.errorTextWrap}>
                    <Text weight="600" style={styles.errorTitle}>
                      {t(`instantBooking.patient.request.titles.${activeRequest.status}` as const)}
                    </Text>
                    <Text color={theme.colors.textSecondary} style={styles.errorNote}>
                      {t(`instantBooking.patient.request.notes.${activeRequest.status}` as const)}
                    </Text>
                  </View>
                </View>
                <Button
                  title={t("instantBooking.patient.request.resetAction")}
                  variant="secondary"
                  onPress={() => navigateWithRequestId(null)}
                  style={styles.archivedButton}
                />
              </Card>
            ) : null}

            {showBrowseState ? (
              <Card
                variant="outlined"
                padding="sm"
                style={[
                  styles.entryCard,
                  {
                    borderColor: theme.colors.borderLight,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <Text weight="600" style={[styles.entryTitle, isCompact && styles.entryTitleCompact]}>
                  {t("instantBooking.patient.list.title")}
                </Text>
                <Text color={theme.colors.textSecondary} style={styles.entryNote}>
                  {t("instantBooking.patient.list.note")}
                </Text>
                <View style={styles.entryMeta}>
                  <StatusBadge label={currencyCode} status="default" />
                  <StatusBadge label={t("instantBooking.patient.list.currencyLabel")} status="info" />
                </View>
              </Card>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PractitionerInstantBookingCard
            practitioner={item}
            currency={currencyCode}
            locale={locale}
            numLocale={numLocale(locale)}
            onBook={handleBook}
            pendingSelectionKey={
              createMutation.isPending && createMutation.variables
                ? `${createMutation.variables.practitionerSlug}:${createMutation.variables.durationMinutes}`
                : null
            }
            createPending={createMutation.isPending}
            compact={isCompact}
          />
        )}
        ListEmptyComponent={
          showBrowseState ? (
            isBrowseLoading ? (
              <LoadingState message={t("instantBooking.patient.empty.loading")} />
            ) : practitionersQuery.isError ? (
              <ErrorState
                onRetry={() => {
                  void practitionersQuery.refetch();
                  void requestsQuery.refetch();
                }}
              />
            ) : (
              <EmptyState
                title={t("instantBooking.patient.empty.title")}
                description={t("instantBooking.patient.empty.note")}
                actionLabel={t("instantBooking.patient.empty.action")}
                onAction={() => {
                  void practitionersQuery.refetch();
                }}
                icon={<Ionicons name="flash-outline" size={44} color={theme.colors.textMuted} />}
              />
            )
          ) : null
        }
        ListFooterComponent={null}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function numLocale(locale: string) {
  return locale.startsWith("ar") ? "ar-SA" : "en-US";
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
    gap: 10,
  },
  headerStack: {
    gap: 10,
    marginBottom: 2,
  },
  heroCard: {
    gap: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  heroTextWrap: {
    flex: 1,
  },
  eyebrow: {
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  heroTitleCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
  heroNote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  heroNoteCompact: {
    fontSize: 11,
    lineHeight: 16,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  errorCard: {
    gap: 0,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  errorNote: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  archivedCard: {
    gap: 10,
  },
  archivedButton: {
    marginTop: 4,
  },
  entryCard: {
    gap: 6,
  },
  entryTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  entryTitleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  entryNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  entryMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  practitionerCard: {
    gap: 10,
  },
  practitionerCardCompact: {
    gap: 8,
  },
  practitionerHeader: {
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  identityTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  identityTitleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  identitySubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bio: {
    fontSize: 11,
    lineHeight: 16,
  },
  durationSection: {
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  durationSectionCompact: {
    padding: 8,
    gap: 6,
  },
  durationSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  durationSectionTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  durationGrid: {
    gap: 6,
  },
  durationGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  durationButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  durationButtonCompact: {
    flexBasis: "48%",
    flexGrow: 1,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  durationButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  durationButtonTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  durationButtonPrice: {
    fontSize: 14,
    lineHeight: 18,
  },
  requestCard: {
    gap: 10,
  },
  requestTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  requestIdentity: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  requestSubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  requestMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryChip: {
    flexBasis: "48%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  summaryChipLabel: {
    fontSize: 11,
    lineHeight: 15,
  },
  summaryChipValue: {
    fontSize: 12,
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
  requestActions: {
    gap: 6,
  },
  requestActionButton: {
    width: "100%",
  },
});
