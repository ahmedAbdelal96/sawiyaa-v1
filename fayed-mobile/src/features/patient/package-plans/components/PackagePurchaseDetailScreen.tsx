import React, { useEffect } from "react";
import { I18nManager, StyleSheet, TouchableOpacity, View } from "react-native";
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
  const isRTL = I18nManager.isRTL;
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
        styles.row,
        {
          flexDirection: isRTL ? "row-reverse" : "row",
          borderBottomColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.rowMeta}>
        <View style={[styles.rowTop, isRTL && styles.rowTopRtl]}>
          <Text weight="600" style={styles.rowTitle}>
            {t("packagePurchases.detail.sessionIndex", {
              current: session.packageSessionIndex,
              total: purchaseSessionCount,
            })}
          </Text>
          <StatusChip label={statusLabel} tone={statusTone} showDot={false} />
        </View>
        <Text color={theme.colors.textSecondary} style={styles.rowTime}>
          {dateTimeRange}
        </Text>
        <Text color={theme.colors.textMuted} style={styles.rowMetaText}>
          {sessionModeLabel} {" · "} {durationLabel}
        </Text>
        {joinAvailabilityNote ? (
          <Text color={theme.colors.textMuted} style={styles.rowMetaText}>
            {joinAvailabilityNote}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={16}
        color={theme.colors.textMuted}
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
  const isRTL = I18nManager.isRTL;
  const placeholderLabel = t("packagePurchases.detail.notBookedYet");

  return (
    <View
      style={[
        styles.unbookedRow,
        {
          flexDirection: isRTL ? "row-reverse" : "row",
          borderBottomColor: theme.colors.borderLight,
          backgroundColor: theme.colors.surfaceSecondary,
        },
      ]}
    >
      <View style={styles.rowMeta}>
        <View style={[styles.rowTop, isRTL && styles.rowTopRtl]}>
          <Text weight="600" style={styles.rowTitle}>
            {t("packagePurchases.detail.sessionIndex", {
              current: sessionIndex,
              total: purchaseSessionCount,
            })}
          </Text>
          <StatusChip label={placeholderLabel} tone="default" showDot={false} />
        </View>
        <Text color={theme.colors.textSecondary} style={styles.rowTime}>
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
          <View style={[styles.summaryTopRow, I18nManager.isRTL && styles.summaryTopRowRtl]}>
            <View style={styles.summaryMeta}>
              <Text weight="600" style={styles.summaryTitle}>
                {title}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.summarySubtitle}>
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
            <Text color={theme.colors.textSecondary} style={styles.summaryLine}>
              {usageSummary}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.summaryLine}>
              {bookedSummary}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.summaryLine}>
              {priceSummary}
            </Text>
          </View>
        </Card>

        {purchase.status === "PENDING_PAYMENT" ? (
          <Card variant="outlined" padding="sm" style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text weight="600" style={styles.paymentTitle}>
                {t("packagePurchases.detail.paymentTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.paymentNote}>
                {paymentExpired
                  ? t("packagePurchases.detail.paymentExpired")
                  : t("packagePurchases.detail.paymentDueHelper")}
              </Text>
            </View>
            <Text color={theme.colors.textMuted} style={styles.paymentSummary}>
              {t("packagePurchases.detail.paymentDueSummary", {
                value: paymentDueDate,
              })}
            </Text>
            {canContinuePayment ? (
              <CompactActionRow
                label={t("packagePurchases.detail.continuePayment")}
                accessibilityLabel={t("packagePurchases.detail.continuePayment")}
                onPress={() => router.push(`/(patient)/package-purchases/${purchase.id}/pay` as never)}
                style={styles.paymentAction}
              />
            ) : null}
          </Card>
        ) : null}

        <Card variant="outlined" padding="sm" style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text weight="600" style={styles.timelineTitle}>
              {t("packagePurchases.detail.timelineTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.timelineSubtitle}>
              {t("packagePurchases.detail.timelineSubtitle")}
            </Text>
          </View>

          {bookedSessions.length > 0 ? (
            <View style={styles.sectionStack}>
              <Text color={theme.colors.textMuted} style={styles.sectionTitle}>
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
              <Text color={theme.colors.textMuted} style={styles.sectionTitle}>
                {t("packagePurchases.detail.unbookedSessionsTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.sectionBody}>
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
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTopRowRtl: {
    flexDirection: "row-reverse",
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
    gap: 4,
  },
  summaryLine: {
    fontSize: 12,
    lineHeight: 18,
  },
  paymentCard: {
    marginHorizontal: 0,
    gap: 6,
  },
  paymentHeader: {
    gap: 2,
  },
  paymentTitle: {
    fontSize: 13,
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
    alignSelf: "flex-start",
    marginTop: 4,
  },
  timelineCard: {
    marginHorizontal: 0,
    gap: 10,
  },
  timelineHeader: {
    gap: 2,
  },
  timelineTitle: {
    fontSize: 14,
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
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  rowStack: {
    gap: 6,
  },
  row: {
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowMeta: {
    flex: 1,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowTopRtl: {
    flexDirection: "row-reverse",
  },
  rowTitle: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  rowTime: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  rowMetaText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  unbookedRow: {
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
});
