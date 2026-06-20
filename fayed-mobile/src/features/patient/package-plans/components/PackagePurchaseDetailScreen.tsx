import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  CompactActionRow,
  DetailPageScaffold,
  EmptyState,
  StatusChip,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { useMyPackagePurchase } from "../hooks";
import { useAppDirection } from "../../../../i18n/direction";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatMoney,
  getPackagePurchaseBookedSessionCount,
  getPackagePurchaseCompletionCount,
  getPackagePurchaseSessionModeTranslationKey,
  getPackagePurchaseSessionPresentationStatusTone,
  getPackagePurchaseSessionPresentationStatusTranslationKey,
  getPackagePurchaseStatusTone,
  getPackagePurchaseStatusTranslationKey,
  isPackagePurchasePaymentExpired,
  formatSessionDateTimeRange,
  resolvePackagePurchasePlanCount,
  getPackagePurchaseUnbookedSessionCount,
  getPackagePurchaseUnbookedSessionIndexes,
  sortPackagePurchaseSessions,
  warnPackagePurchaseContractMismatch,
} from "../lib";

function SessionTimelineRow({
  session,
  purchaseSessionCount,
  locale,
  onPress,
}: {
  session: {
    id: string;
    presentationStatus: Parameters<
      typeof getPackagePurchaseSessionPresentationStatusTranslationKey
    >[0];
    joinAvailability: {
      canJoin: boolean;
      blockedReason: string | null;
      availableAt: string | null;
      expiresAt: string | null;
    };
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    durationMinutes: number;
    sessionMode: string;
    packageSessionIndex: number;
  };
  purchaseSessionCount: number;
  locale: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { rowDirection, textAlign, chevronForward } = useAppDirection();
  const statusLabel = t(
    getPackagePurchaseSessionPresentationStatusTranslationKey(session.presentationStatus),
    {
      defaultValue: session.presentationStatus,
    },
  );
  const statusTone = getPackagePurchaseSessionPresentationStatusTone(
    session.presentationStatus,
  );
  const sessionModeLabel = t(getPackagePurchaseSessionModeTranslationKey(session.sessionMode), {
    defaultValue: session.sessionMode,
  });
  const durationLabel = t("packagePurchases.detail.duration", {
    count: session.durationMinutes,
  });
  const dateTimeRange = formatSessionDateTimeRange(
    session.scheduledStartAt,
    session.scheduledEndAt,
    locale,
  );
  const joinAvailabilityNote = session.joinAvailability.canJoin
    ? null
    : session.joinAvailability.availableAt &&
      new Date(session.joinAvailability.availableAt).getTime() > Date.now()
      ? t("packagePurchases.detail.joinAvailableAt", {
          datetime: formatDatetime(session.joinAvailability.availableAt, locale),
        })
      : null;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={t("packagePurchases.detail.viewSession", {
        defaultValue: "View session",
      })}
      onPress={onPress}
      style={[
        styles.timelineRowCard,
        {
          flexDirection: rowDirection,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceRaised,
        },
      ]}
    >
      <View style={styles.rowMeta}>
        <View style={[styles.rowTop, { flexDirection: rowDirection }]}>
          <Text weight="600" style={[styles.rowTitle, { textAlign }]}>
            {t("packagePurchases.detail.sessionIndex", {
              current: session.packageSessionIndex,
              total: purchaseSessionCount,
            })}
          </Text>
          <StatusChip label={statusLabel} tone={statusTone} showDot={false} />
        </View>
        <Text color={theme.colors.textSecondary} style={[styles.rowTime, { textAlign }]}>
          {dateTimeRange}
        </Text>
        <Text color={theme.colors.textMuted} style={[styles.rowMetaText, { textAlign }]}>
          {sessionModeLabel} {" · "} {durationLabel}
        </Text>
        {joinAvailabilityNote ? (
          <Text color={theme.colors.textMuted} style={[styles.rowMetaText, { textAlign }]}>
            {joinAvailabilityNote}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={chevronForward}
        size={18}
        color={theme.colors.textMuted}
        style={styles.chevronIcon}
      />
    </TouchableOpacity>
  );
}

function UnbookedSessionTimelineRow({
  sessionIndex,
  purchaseSessionCount,
}: {
  sessionIndex: number;
  purchaseSessionCount: number;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { rowDirection, textAlign } = useAppDirection();
  const placeholderLabel = t("packagePurchases.detail.notBookedYet");

  return (
    <View
      style={[
        styles.unbookedRowCard,
        {
          flexDirection: rowDirection,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <View style={styles.rowMeta}>
        <View style={[styles.rowTop, { flexDirection: rowDirection }]}>
          <Text weight="600" style={[styles.rowTitle, { textAlign, color: theme.colors.textSecondary }]}>
            {t("packagePurchases.detail.sessionIndex", {
              current: sessionIndex,
              total: purchaseSessionCount,
            })}
          </Text>
          <StatusChip label={placeholderLabel} tone="default" showDot={false} />
        </View>
        <Text color={theme.colors.textMuted} style={[styles.rowTime, { textAlign }]}>
          {t("packagePurchases.detail.unbookedSessionSubtitle")}
        </Text>
      </View>
    </View>
  );
}

export default function PackagePurchaseDetailScreen({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { rowDirection, textAlign } = useAppDirection();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const purchaseQuery = useMyPackagePurchase(purchaseId);
  const purchase = purchaseQuery.data?.item ?? null;
  const planCountFromCode = purchase ? resolvePackagePurchasePlanCount(purchase.planCode) : null;
  const hasPlanMismatch = Boolean(
    purchase &&
      planCountFromCode !== null &&
      planCountFromCode !== purchase.sessionCount,
  );

  useEffect(() => {
    if (!purchase || !hasPlanMismatch) {
      return;
    }

    warnPackagePurchaseContractMismatch({
      purchaseId: purchase.id,
      planCode: purchase.planCode,
      sessionCount: purchase.sessionCount,
      linkedSessionsCount: purchase.linkedSessions.totalItems,
    });
  }, [
    hasPlanMismatch,
    purchase,
    purchase?.id,
    purchase?.linkedSessions.totalItems,
    purchase?.planCode,
    purchase?.sessionCount,
  ]);

  if (purchaseQuery.isSuccess && !purchase) {
    return (
      <DetailPageScaffold title={t("packagePurchases.detail.title")} showBack>
        <EmptyState
          title={t("packagePurchases.detail.notFoundTitle")}
          description={t("packagePurchases.detail.notFoundDescription")}
          actionLabel={t("packagePurchases.detail.back")}
          onAction={() => router.replace("/(patient)/package-purchases" as never)}
        />
      </DetailPageScaffold>
    );
  }

  if (purchaseQuery.isLoading) {
    return (
      <DetailPageScaffold
        title={t("packagePurchases.detail.title")}
        showBack
        loading
        loadingMessage={t("packagePurchases.detail.loading")}
      >
        <View />
      </DetailPageScaffold>
    );
  }

  if (purchaseQuery.isError || !purchase) {
    return (
      <DetailPageScaffold
        title={t("packagePurchases.detail.title")}
        showBack
        error={purchaseQuery.isError}
        errorTitle={t("packagePurchases.detail.errorTitle")}
        errorMessage={t("packagePurchases.detail.errorMessage")}
        onRetry={() => purchaseQuery.refetch()}
        retryText={t("packagePurchases.detail.retry")}
      >
        <View />
      </DetailPageScaffold>
    );
  }

  const completedCount = getPackagePurchaseCompletionCount(purchase);
  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);
  const bookedSessions = sortPackagePurchaseSessions(purchase.linkedSessions.items);
  const bookedSessionCount = getPackagePurchaseBookedSessionCount(purchase);
  const unbookedSessionCount = getPackagePurchaseUnbookedSessionCount(purchase);
  const unbookedSessionIndexes = getPackagePurchaseUnbookedSessionIndexes(purchase);
  const currency = resolveSupportedCurrencyCode({
    currencyCode: purchase.selectedCurrencyCode,
    regionalPricingMode: purchase.regionalPricingMode,
    resolvedCountryIsoCode: purchase.resolvedCountryIsoCode,
  });
  const title = t("packagePurchases.plans.generic", {
    count: purchase.sessionCount,
    defaultValue: `${purchase.sessionCount} session package`,
  });
  const paymentDueDate = purchase.paymentExpiresAt
    ? formatDatetime(purchase.paymentExpiresAt, locale)
    : "-";
  const usageSummary = t("packagePurchases.detail.summaryUsageBooked", {
    count: completedCount,
    total: purchase.sessionCount,
  });
  const bookedSummary = t("packagePurchases.detail.bookedSummary", {
    count: unbookedSessionCount,
    booked: bookedSessionCount,
    total: purchase.sessionCount,
  });
  const priceSummary = t("packagePurchases.detail.priceSummary", {
    value: formatMoney(purchase.patientPayableTotal, currency, locale),
    discount: `${purchase.discountPercent}%`,
  });

  return (
    <DetailPageScaffold
      title={t("packagePurchases.detail.title")}
      showBack
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.stack}>
        <Card variant="outlined" padding="sm" style={styles.summaryCard}>
          <View style={[styles.summaryTopRow, { flexDirection: rowDirection }]}>
            <View style={styles.summaryMeta}>
              <Text weight="600" style={[styles.summaryTitle, { textAlign }]}>
                {title}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.summarySubtitle, { textAlign }]}>
                {t("packagePurchases.detail.subtitle")}
              </Text>
            </View>
            <StatusChip
              label={t(getPackagePurchaseStatusTranslationKey(purchase.status), {
                defaultValue: purchase.status,
              })}
              tone={getPackagePurchaseStatusTone(purchase.status)}
              showDot={false}
            />
          </View>

          <View style={styles.summaryLines}>
            <View style={[styles.summaryMetaRow, { flexDirection: rowDirection }]}>
              <Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} style={styles.metaIcon} />
              <Text color={theme.colors.textSecondary} style={[styles.summaryLine, { textAlign }]}>
                {usageSummary}
              </Text>
            </View>
            <View style={[styles.summaryMetaRow, { flexDirection: rowDirection }]}>
              <Ionicons name="bookmark-outline" size={15} color={theme.colors.textSecondary} style={styles.metaIcon} />
              <Text color={theme.colors.textSecondary} style={[styles.summaryLine, { textAlign }]}>
                {bookedSummary}
              </Text>
            </View>
            <View style={[styles.summaryMetaRow, { flexDirection: rowDirection }]}>
              <Ionicons name="cash-outline" size={15} color={theme.colors.textSecondary} style={styles.metaIcon} />
              <Text color={theme.colors.textSecondary} style={[styles.summaryLine, { textAlign }]}>
                {priceSummary}
              </Text>
            </View>
          </View>
        </Card>

        {purchase.status === "PENDING_PAYMENT" ? (
          <Card variant="outlined" padding="sm" style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text weight="600" style={[styles.paymentTitle, { textAlign }]}>
                {t("packagePurchases.detail.paymentTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.paymentNote, { textAlign }]}>
                {paymentExpired
                  ? t("packagePurchases.detail.paymentExpired")
                  : t("packagePurchases.detail.paymentDueHelper")}
              </Text>
            </View>
            <Text color={theme.colors.textMuted} style={[styles.paymentSummary, { textAlign }]}>
              {t("packagePurchases.detail.paymentDueSummary", {
                value: paymentDueDate,
              })}
            </Text>
            {canContinuePayment ? (
              <CompactActionRow
                label={t("packagePurchases.detail.continuePayment")}
                accessibilityLabel={t("packagePurchases.detail.continuePayment")}
                onPress={() => router.push(`/(patient)/package-purchases/${purchase.id}/pay` as never)}
                style={[styles.paymentAction, { alignSelf: rowDirection === "row" ? "flex-start" : "flex-end" }]}
              />
            ) : null}
          </Card>
        ) : null}

        <Card variant="outlined" padding="sm" style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text weight="600" style={[styles.timelineTitle, { textAlign }]}>
              {t("packagePurchases.detail.timelineTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={[styles.timelineSubtitle, { textAlign }]}>
              {t("packagePurchases.detail.timelineSubtitle")}
            </Text>
          </View>

          {bookedSessions.length > 0 ? (
            <View style={styles.sectionStack}>
              <Text color={theme.colors.textMuted} style={[styles.sectionTitle, { textAlign }]}>
                {t("packagePurchases.detail.bookedSessionsTitle")}
              </Text>
              <View style={styles.rowStack}>
                {bookedSessions.map((session) => (
                  <SessionTimelineRow
                    key={session.id}
                    session={session}
                    purchaseSessionCount={purchase.sessionCount}
                    locale={locale}
                    onPress={() => router.push(`/(patient)/sessions/${session.id}` as never)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {unbookedSessionIndexes.length > 0 ? (
            <View style={styles.sectionStack}>
              <Text color={theme.colors.textMuted} style={[styles.sectionTitle, { textAlign }]}>
                {t("packagePurchases.detail.unbookedSessionsTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={[styles.sectionBody, { textAlign }]}>
                {t("packagePurchases.detail.unbookedSessionsBody", {
                  count: unbookedSessionCount,
                })}
              </Text>
              <View style={styles.rowStack}>
                {unbookedSessionIndexes.map((sessionIndex) => (
                  <UnbookedSessionTimelineRow
                    key={sessionIndex}
                    sessionIndex={sessionIndex}
                    purchaseSessionCount={purchase.sessionCount}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </Card>
      </View>
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 28,
  },
  stack: {
    gap: 12,
  },
  summaryCard: {
    marginHorizontal: 0,
    gap: 10,
    borderRadius: 20,
  },
  summaryTopRow: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryMeta: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 17,
    lineHeight: 23,
  },
  summarySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  summaryLines: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  summaryMetaRow: {
    alignItems: "center",
    gap: 8,
  },
  metaIcon: {
    width: 16,
    textAlign: "center",
  },
  summaryLine: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  paymentCard: {
    marginHorizontal: 0,
    gap: 8,
    borderRadius: 20,
  },
  paymentHeader: {
    gap: 2,
  },
  paymentTitle: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  paymentNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  paymentSummary: {
    fontSize: 12,
    lineHeight: 18,
  },
  paymentAction: {
    marginTop: 4,
  },
  timelineCard: {
    marginHorizontal: 0,
    gap: 14,
    borderRadius: 20,
  },
  timelineHeader: {
    gap: 2,
  },
  timelineTitle: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  timelineSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionStack: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 18,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  rowStack: {
    gap: 8,
  },
  timelineRowCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  unbookedRowCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 12,
  },
  rowMeta: {
    flex: 1,
  },
  rowTop: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  rowTime: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  rowMetaText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  chevronIcon: {
    width: 18,
    textAlign: "center",
  },
});
