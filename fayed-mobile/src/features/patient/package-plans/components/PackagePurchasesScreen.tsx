import React, { useEffect, useMemo } from "react";
import { FlatList, I18nManager, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  CompactActionRow,
  ListPageScaffold,
  StatusChip,
  Text,
} from "../../../../components/ui";
import { MOBILE_TAB_BAR_HEIGHT } from "../../../../components/mobile-shell";
import { useTheme } from "../../../../providers/ThemeProvider";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { useInfiniteMyPackagePurchases } from "../hooks";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatMoney,
  getNextUpcomingPackageSession,
  getPackagePurchaseCompletionCount,
  getPackagePurchaseStatusTone,
  getPackagePurchaseStatusTranslationKey,
  resolvePackagePurchasePlanCount,
  warnPackagePurchaseContractMismatch,
} from "../lib";
import type { PatientPackagePurchaseItem } from "../types";

function PackagePurchaseDetailsHint({
  label,
}: {
  label: string;
}) {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.actionHint,
        {
          flexDirection: isRTL ? "row-reverse" : "row",
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <Text weight="600" style={styles.actionHintLabel} color={theme.colors.primary}>
        {label}
      </Text>
      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={15}
        color={theme.colors.primary}
      />
    </View>
  );
}

function PackagePurchaseCard({
  purchase,
  locale,
}: {
  purchase: PatientPackagePurchaseItem;
  locale: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const currency = resolveSupportedCurrencyCode({
    currencyCode: purchase.selectedCurrencyCode,
    regionalPricingMode: purchase.regionalPricingMode,
    resolvedCountryIsoCode: purchase.resolvedCountryIsoCode,
  });

  const completedCount = getPackagePurchaseCompletionCount(purchase);
  const remainingCount = Math.max(purchase.sessionCount - completedCount, 0);
  const nextUpcomingSession = getNextUpcomingPackageSession(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);
  const title = t("packagePurchases.plans.generic", {
    count: purchase.sessionCount,
    defaultValue: `${purchase.sessionCount} session package`,
  });
  const statusLabel = t(getPackagePurchaseStatusTranslationKey(purchase.status), {
    defaultValue: purchase.status,
  });
  const dueDate =
    purchase.status === "PENDING_PAYMENT" && purchase.paymentExpiresAt
      ? formatDatetime(purchase.paymentExpiresAt, locale)
      : null;
  const planCountFromCode = resolvePackagePurchasePlanCount(purchase.planCode);
  const hasPlanMismatch =
    planCountFromCode !== null && planCountFromCode !== purchase.sessionCount;

  useEffect(() => {
    if (!hasPlanMismatch) {
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
    purchase.id,
    purchase.linkedSessions.totalItems,
    purchase.planCode,
    purchase.sessionCount,
  ]);

  const handleOpenDetails = () => {
    router.push(`/(patient)/package-purchases/${purchase.id}` as never);
  };

  const handleContinuePayment = () => {
    router.push(`/(patient)/package-purchases/${purchase.id}/pay` as never);
  };

  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={handleOpenDetails}
      accessibilityRole="button"
      accessibilityLabel={t("packagePurchases.card.accessibilityLabel", {
        count: purchase.sessionCount,
        defaultValue: `View details for a ${purchase.sessionCount}-session package`,
      })}
      style={styles.card}
    >
      <View style={[styles.topRow, isRTL && styles.topRowRtl]}>
        <View style={styles.titleCol}>
          <Text weight="600" style={styles.planTitle}>
            {title}
          </Text>
        </View>
        <StatusChip label={statusLabel} tone={getPackagePurchaseStatusTone(purchase.status)} showDot={false} />
      </View>

      <View style={styles.metaStack}>
        <Text color={theme.colors.textSecondary} style={styles.metaLine}>
          {t("packagePurchases.card.usedSummary", {
            completed: completedCount,
            total: purchase.sessionCount,
            remaining: remainingCount,
          })}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.metaLine}>
          {t("packagePurchases.card.priceSummary", {
            value: formatMoney(purchase.patientPayableTotal, currency, locale),
            discount: `${purchase.discountPercent}%`,
          })}
        </Text>
        <Text color={theme.colors.textSecondary} style={styles.metaLine}>
          {purchase.status === "PENDING_PAYMENT" && dueDate
            ? t("packagePurchases.card.paymentDueSummary", {
                value: dueDate,
              })
            : nextUpcomingSession
              ? t("packagePurchases.card.nextSessionSummary", {
                  value: formatDatetime(nextUpcomingSession.scheduledStartAt, locale),
                })
              : t("packagePurchases.card.noNextSession")}
        </Text>
      </View>

      <PackagePurchaseDetailsHint label={t("packagePurchases.card.viewDetails")} />

      {purchase.status === "PENDING_PAYMENT" && canContinuePayment ? (
        <CompactActionRow
          label={t("packagePurchases.card.continuePayment")}
          onPress={handleContinuePayment}
          accessibilityLabel={t("packagePurchases.card.continuePayment")}
          style={styles.paymentAction}
        />
      ) : null}
    </Card>
  );
}

export default function PackagePurchasesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const purchasesQuery = useInfiniteMyPackagePurchases({ limit: 12 });

  const purchases = useMemo(
    () => purchasesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [purchasesQuery.data?.pages],
  );

  const hasNextPage = purchasesQuery.hasNextPage ?? false;
  const isEmpty = !purchasesQuery.isLoading && !purchasesQuery.isError && purchases.length === 0;

  const loadingMoreLabel = t("packagePurchases.list.loadingMore", "Loading more packages...");
  const endOfListLabel = t("packagePurchases.list.endOfList", "You've reached the end of your packages.");

  return (
    <ListPageScaffold
      title={t("packagePurchases.title")}
      showBack
      loading={purchasesQuery.isLoading}
      loadingMessage={t("packagePurchases.loading")}
      error={purchasesQuery.isError}
      errorTitle={t("packagePurchases.errorTitle")}
      errorMessage={t("packagePurchases.errorMessage")}
      onRetry={() => purchasesQuery.refetch()}
      retryText={t("packagePurchases.retry")}
      empty={isEmpty}
      emptyTitle={t("packagePurchases.emptyTitle")}
      emptyDescription={t("packagePurchases.emptyDescription")}
      emptyActionLabel={t("packagePurchases.emptyAction")}
      onEmptyAction={() => router.push("/(patient)/discovery" as never)}
      contentContainerStyle={styles.scaffold}
    >
      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PackagePurchaseCard purchase={item} locale={locale} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={purchasesQuery.isRefetching}
        onRefresh={() => purchasesQuery.refetch()}
        onEndReached={() => {
          if (
            hasNextPage &&
            !purchasesQuery.isFetchingNextPage &&
            !purchasesQuery.isLoading &&
            !purchasesQuery.isError
          ) {
            purchasesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.stack}>
            <Card variant="outlined" padding="sm" style={styles.heroCard}>
              <Text weight="bold" style={styles.heroTitle}>
                {t("packagePurchases.heroTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {t("packagePurchases.heroSubtitle")}
              </Text>
            </Card>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerStack}>
            {purchasesQuery.isFetchingNextPage ? (
              <Text color={theme.colors.textMuted} style={styles.footerLabel}>
                {loadingMoreLabel}
              </Text>
            ) : null}
            {!hasNextPage && purchases.length > 0 ? (
              <Text color={theme.colors.textMuted} style={styles.footerLabel}>
                {endOfListLabel}
              </Text>
            ) : null}
          </View>
        }
      />
    </ListPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 14,
    paddingBottom: MOBILE_TAB_BAR_HEIGHT + 40,
  },
  stack: {
    gap: 12,
  },
  heroCard: {
    marginHorizontal: 0,
    gap: 4,
  },
  heroTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    marginHorizontal: 0,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  topRowRtl: {
    flexDirection: "row-reverse",
  },
  titleCol: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  metaStack: {
    gap: 3,
  },
  metaLine: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  actionHint: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionHintLabel: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  paymentAction: {
    marginTop: 2,
    alignSelf: "flex-start",
  },
  footerStack: {
    gap: 8,
    paddingTop: 4,
  },
  footerLabel: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
