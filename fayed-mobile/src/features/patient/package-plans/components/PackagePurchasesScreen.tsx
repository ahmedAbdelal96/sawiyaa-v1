import React, { useEffect, useMemo } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
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
import { useAppDirection } from "../../../../i18n/direction";
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
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { rowDirection, chevronForward } = useAppDirection();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.actionHint,
        {
          flexDirection: rowDirection,
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <Text weight="600" style={styles.actionHintLabel} color={theme.colors.primary}>
        {label}
      </Text>
      <Ionicons
        name={chevronForward}
        size={15}
        color={theme.colors.primary}
      />
    </TouchableOpacity>
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
  const { rowDirection, textAlign } = useAppDirection();

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
      style={styles.card}
    >
      <View style={[styles.topRow, { flexDirection: rowDirection }]}>
        <View style={styles.titleCol}>
          <Text weight="600" style={[styles.planTitle, { textAlign }]}>
            {title}
          </Text>
        </View>
        <StatusChip label={statusLabel} tone={getPackagePurchaseStatusTone(purchase.status)} showDot={false} />
      </View>

      <View style={styles.metaStack}>
        <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.textSecondary} style={styles.metaIcon} />
          <Text color={theme.colors.textSecondary} style={[styles.metaLine, { textAlign }]}>
            {t("packagePurchases.card.usedSummary", {
              completed: completedCount,
              total: purchase.sessionCount,
              remaining: remainingCount,
            })}
          </Text>
        </View>
        
        <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
          <Ionicons name="cash-outline" size={15} color={theme.colors.textSecondary} style={styles.metaIcon} />
          <Text color={theme.colors.textSecondary} style={[styles.metaLine, { textAlign }]}>
            {t("packagePurchases.card.priceSummary", {
              value: formatMoney(purchase.patientPayableTotal, currency, locale),
              discount: `${purchase.discountPercent}%`,
            })}
          </Text>
        </View>

        <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
          <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} style={styles.metaIcon} />
          <Text color={theme.colors.textSecondary} style={[styles.metaLine, { textAlign }]}>
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
      </View>

      <PackagePurchaseDetailsHint label={t("packagePurchases.card.viewDetails")} onPress={handleOpenDetails} />

      {purchase.status === "PENDING_PAYMENT" && canContinuePayment ? (
        <CompactActionRow
          label={t("packagePurchases.card.continuePayment")}
          onPress={handleContinuePayment}
          accessibilityLabel={t("packagePurchases.card.continuePayment")}
          style={[styles.paymentAction, { alignSelf: rowDirection === "row" ? "flex-start" : "flex-end" }]}
        />
      ) : null}
    </Card>
  );
}

export default function PackagePurchasesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { rowDirection, textAlign } = useAppDirection();
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
            <Card variant="flat" padding="md" style={styles.heroCard}>
              <View style={[styles.heroRow, { flexDirection: rowDirection }]}>
                <View style={[styles.heroAccentLine, { backgroundColor: theme.colors.primary }]} />
                <View style={styles.heroContent}>
                  <Text weight="bold" style={[styles.heroTitle, { textAlign }]}>
                    {t("packagePurchases.heroTitle")}
                  </Text>
                  <Text color={theme.colors.textSecondary} style={[styles.heroSubtitle, { textAlign }]}>
                    {t("packagePurchases.heroSubtitle")}
                  </Text>
                </View>
              </View>
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
    borderRadius: 20,
  },
  heroRow: {
    alignItems: "stretch",
    gap: 12,
  },
  heroAccentLine: {
    width: 4,
    borderRadius: 2,
  },
  heroContent: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  card: {
    marginHorizontal: 0,
    gap: 10,
    borderRadius: 20,
  },
  topRow: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  metaStack: {
    gap: 6,
    paddingVertical: 4,
  },
  metaRow: {
    alignItems: "center",
    gap: 8,
  },
  metaIcon: {
    width: 16,
    textAlign: "center",
  },
  metaLine: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
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
