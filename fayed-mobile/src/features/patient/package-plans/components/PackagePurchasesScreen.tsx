import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CompactActionRow,
  ListPageScaffold,
  StatusChip,
  SummaryRow,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useMyPackagePurchases } from "../hooks";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatMoney,
  getNextUpcomingPackageSession,
  getPackagePurchaseCompletionCount,
  getPackagePurchaseLiveCount,
  getPackagePurchasePendingCount,
  getPackagePurchaseTerminalCount,
  isPackagePurchasePaymentExpired,
} from "../lib";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import type { PatientPackagePurchaseItem } from "../types";

function getStatusTone(status: PatientPackagePurchaseItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "COMPLETED":
      return "default" as const;
    case "PENDING_PAYMENT":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

function PurchaseCard({ purchase, locale }: { purchase: PatientPackagePurchaseItem; locale: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = resolveSupportedCurrencyCode({
    currencyCode: purchase.selectedCurrencyCode,
    regionalPricingMode: purchase.regionalPricingMode,
    resolvedCountryIsoCode: purchase.resolvedCountryIsoCode,
  });
  const completedCount = getPackagePurchaseCompletionCount(purchase);
  const pendingCount = getPackagePurchasePendingCount(purchase);
  const liveCount = getPackagePurchaseLiveCount(purchase);
  const terminalCount = getPackagePurchaseTerminalCount(purchase);
  const nextUpcomingSession = getNextUpcomingPackageSession(purchase);
  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);

  return (
    <Card variant="elevated" padding="lg" style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text weight="bold" style={styles.planCode}>
            {purchase.planCode}
          </Text>
          <Text color="#64748b" style={styles.planSubtitle}>
            {t("packagePurchases.card.sessions", {
              count: purchase.sessionCount,
              defaultValue:
                purchase.sessionCount === 1
                  ? "1 session"
                  : `${purchase.sessionCount} sessions`,
            })}
          </Text>
        </View>
        <StatusChip label={purchase.status} tone={getStatusTone(purchase.status)} showDot={false} />
      </View>

      <View style={styles.moneyGrid}>
        <Card variant="outlined" padding="md" style={styles.moneyCard}>
          <Text color="#64748b" style={styles.moneyLabel}>
            {t("packagePurchases.card.total", "Amount")}
          </Text>
          <Text weight="bold" style={styles.moneyValue}>
            {formatMoney(purchase.patientPayableTotal, currency, locale)}
          </Text>
        </Card>
        <Card variant="outlined" padding="md" style={styles.moneyCard}>
          <Text color="#64748b" style={styles.moneyLabel}>
            {t("packagePurchases.card.discount", "Discount")}
          </Text>
          <Text weight="bold" style={styles.moneyValue}>
            {purchase.discountPercent}%
          </Text>
        </Card>
      </View>

      <View style={styles.summaryStack}>
        <SummaryRow
          label={t("packagePurchases.card.progress", "Progress")}
          value={t("packagePurchases.card.progressValue", {
            completed: completedCount,
            total: purchase.sessionCount,
            defaultValue: `${completedCount}/${purchase.sessionCount}`,
          })}
        />
        <SummaryRow
          label={t("packagePurchases.card.linkedSessions", "Linked sessions")}
          value={String(purchase.linkedSessionsCount)}
        />
        <SummaryRow
          label={t("packagePurchases.card.window", "Payment window")}
          value={
            purchase.paymentExpiresAt
              ? formatDatetime(purchase.paymentExpiresAt, locale)
              : "-"
          }
          helperText={
            purchase.status === "PENDING_PAYMENT"
              ? paymentExpired
                ? t("packagePurchases.card.paymentExpired", "Payment window expired")
                : t("packagePurchases.card.paymentActive", "Payment is still active")
              : undefined
          }
        />
      </View>

      {nextUpcomingSession ? (
        <Card variant="outlined" padding="md" style={styles.nextCard}>
          <Text color="#0f766e" style={styles.nextLabel}>
            {t("packagePurchases.card.nextSession", "Next session")}
          </Text>
          <Text weight="600" style={styles.nextTitle}>
            {t("packagePurchases.card.sessionIndex", {
              current: nextUpcomingSession.packageSessionIndex,
              total: purchase.sessionCount,
              defaultValue: `Session ${nextUpcomingSession.packageSessionIndex}/${purchase.sessionCount}`,
            })}
          </Text>
          <Text color="#64748b" style={styles.nextMeta}>
            {formatDatetime(nextUpcomingSession.scheduledStartAt, locale)}
          </Text>
        </Card>
      ) : null}

      <View style={styles.badgeRow}>
        <StatusChip
          label={t("packagePurchases.card.completedCount", {
            count: completedCount,
            defaultValue: `${completedCount} completed`,
          })}
          tone="success"
          showDot={false}
        />
        <StatusChip
          label={t("packagePurchases.card.pendingCount", {
            count: pendingCount,
            defaultValue: `${pendingCount} pending`,
          })}
          tone="warning"
          showDot={false}
        />
        <StatusChip
          label={t("packagePurchases.card.liveCount", {
            count: liveCount,
            defaultValue: `${liveCount} live`,
          })}
          tone="info"
          showDot={false}
        />
        <StatusChip
          label={t("packagePurchases.card.terminalCount", {
            count: terminalCount,
            defaultValue: `${terminalCount} ended`,
          })}
          tone="default"
          showDot={false}
        />
      </View>

      <CompactActionRow
        label={t("packagePurchases.card.viewDetails", "View details")}
        onPress={() => router.push(`/(patient)/package-purchases/${purchase.id}` as never)}
        accessibilityLabel={t("packagePurchases.card.viewDetails", "View details")}
        style={styles.actionRow}
      />

      {purchase.status === "PENDING_PAYMENT" && canContinuePayment ? (
        <Button
          title={t("packagePurchases.card.continuePayment", "Continue payment")}
          onPress={() => router.push(`/(patient)/package-purchases/${purchase.id}/pay` as never)}
          style={styles.paymentButton}
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
  const purchasesQuery = useMyPackagePurchases({ page: 1, limit: 12 });
  const purchases = purchasesQuery.data?.items ?? [];

  return (
    <ListPageScaffold
      title={t("packagePurchases.title", "Package purchases")}
      showBack
      loading={purchasesQuery.isLoading}
      loadingMessage={t("packagePurchases.loading", "Loading package purchases...")}
      error={purchasesQuery.isError}
      errorTitle={t("packagePurchases.errorTitle", "We could not load your packages")}
      errorMessage={t("packagePurchases.errorMessage", "Please try again in a moment.")}
      onRetry={() => purchasesQuery.refetch()}
      retryText={t("packagePurchases.retry", "Try again")}
      empty={purchases.length === 0}
      emptyTitle={t("packagePurchases.emptyTitle", "No package purchases yet")}
      emptyDescription={t(
        "packagePurchases.emptyDescription",
        "Buy a package from a therapist profile to see it here.",
      )}
      emptyActionLabel={t("packagePurchases.emptyAction", "Browse therapists")}
      onEmptyAction={() => router.push("/(patient)/discovery" as never)}
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.stack}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <Text weight="bold" style={styles.heroTitle}>
            {t("packagePurchases.heroTitle", "Track package progress")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
            {t(
              "packagePurchases.heroSubtitle",
              "Review payment windows, session progress, and upcoming package sessions.",
            )}
          </Text>
        </Card>

        <View style={styles.list}>
          {purchases.map((purchase) => (
            <PurchaseCard key={purchase.id} purchase={purchase} locale={locale} />
          ))}
        </View>
      </View>
    </ListPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 24,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  list: {
    gap: 14,
  },
  card: {
    marginHorizontal: 0,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  planCode: {
    fontSize: 22,
    lineHeight: 30,
  },
  planSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  moneyGrid: {
    flexDirection: "row",
    gap: 10,
  },
  moneyCard: {
    flex: 1,
    marginHorizontal: 0,
  },
  moneyLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.16,
  },
  moneyValue: {
    fontSize: 18,
    marginTop: 6,
  },
  summaryStack: {
    gap: 2,
  },
  nextCard: {
    marginHorizontal: 0,
  },
  nextLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.16,
  },
  nextTitle: {
    fontSize: 16,
    marginTop: 4,
  },
  nextMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionRow: {
    marginTop: 2,
  },
  paymentButton: {
    marginTop: 2,
  },
});

