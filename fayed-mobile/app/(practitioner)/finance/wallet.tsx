import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../../src/components/ui";
import {
  usePractitionerSettlementItems,
  usePractitionerWalletSummary,
} from "../../../src/features/practitioner/finance/hooks";
import {
  formatDateTime,
  formatMoney,
  monthYearLabel,
  settlementStatusTone,
} from "../../../src/features/practitioner/finance/utils";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useRouter } from "expo-router";

const PREVIEW_LIMIT = 3;

export default function PractitionerWalletScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const walletQuery = usePractitionerWalletSummary();
  const settlementsQuery = usePractitionerSettlementItems({ page: 1, limit: PREVIEW_LIMIT });

  const wallet = walletQuery.data?.item ?? null;
  const recentSettlements = settlementsQuery.data?.items ?? [];

  if (walletQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.wallet.title")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (walletQuery.isError) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.wallet.title")} showBack />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.wallet.errorTitle")}
          message={t("practitioner.finance.wallet.errorBody")}
          onRetry={walletQuery.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.finance.wallet.title")}
        showBack
        rightElement={
          <TouchableOpacity onPress={() => walletQuery.refetch()}>
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <Text weight="bold" style={styles.heroTitle}>
            {t("practitioner.finance.wallet.title")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
            {t("practitioner.finance.wallet.subtitle")}
          </Text>

          <View style={styles.primaryBalance}>
            <Text color={theme.colors.textMuted} style={styles.balanceLabel}>
              {t("practitioner.finance.wallet.available")}
            </Text>
            <Text weight="bold" style={styles.balanceValue}>
              {formatMoney(wallet?.availableBalance ?? "0", wallet?.currency ?? "EGP", locale)}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.balanceHint}>
              {t("practitioner.finance.wallet.balanceHint")}
            </Text>
          </View>
        </Card>

        <Card variant="outlined" padding="lg">
          <Text weight="600" style={styles.sectionTitle}>
            {t("practitioner.finance.wallet.summary")}
          </Text>
          <View style={styles.metricGrid}>
            <MetricCard label={t("practitioner.finance.wallet.available")} value={formatMoney(wallet?.availableBalance ?? "0", wallet?.currency ?? "EGP", locale)} />
            <MetricCard label={t("practitioner.finance.wallet.pending")} value={formatMoney(wallet?.pendingBalance ?? "0", wallet?.currency ?? "EGP", locale)} />
            <MetricCard label={t("practitioner.finance.wallet.reserved")} value={formatMoney(wallet?.reservedBalance ?? "0", wallet?.currency ?? "EGP", locale)} />
            <MetricCard label={t("practitioner.finance.wallet.totalEarned")} value={formatMoney(wallet?.totalEarned ?? "0", wallet?.currency ?? "EGP", locale)} />
            <MetricCard label={t("practitioner.finance.wallet.lifetimePaidOut")} value={formatMoney(wallet?.lifetimePaidOut ?? "0", wallet?.currency ?? "EGP", locale)} />
            <MetricCard label={t("practitioner.finance.wallet.lastLedgerEntryAt")} value={formatDateTime(wallet?.lastLedgerEntryAt ?? null, locale)} />
            <MetricCard label={t("practitioner.finance.wallet.updatedAt")} value={formatDateTime(wallet?.updatedAt ?? null, locale)} />
          </View>
        </Card>

        <Card variant="outlined" padding="lg">
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("practitioner.finance.wallet.recentSettlements")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(practitioner)/finance/settlements")}>
              <Text color={theme.colors.textBrand} weight="600">
                {t("practitioner.finance.common.viewAll")}
              </Text>
            </TouchableOpacity>
          </View>
          {settlementsQuery.isLoading ? (
            <LoadingState message={t("practitioner.finance.common.loading")} />
          ) : settlementsQuery.isError ? (
            <ErrorState
              title={t("practitioner.finance.settlements.errorTitle")}
              message={t("practitioner.finance.settlements.errorBody")}
              onRetry={settlementsQuery.refetch}
            />
          ) : recentSettlements.length ? (
            <View style={styles.listWrap}>
              {recentSettlements.map((item) => (
                <View key={item.id} style={[styles.settlementRow, { borderColor: theme.colors.borderLight }]}>
                  <View style={styles.settlementHeader}>
                    <View style={styles.settlementText}>
                      <Text weight="600" style={styles.settlementTitle} numberOfLines={1}>
                        {monthYearLabel(item.batchPeriodYear, item.batchPeriodMonth, locale)}
                      </Text>
                      <Text color={theme.colors.textMuted} style={styles.settlementMeta}>
                        {item.externalPayoutRef
                          ? `${t("practitioner.finance.settlements.received")} ${item.externalPayoutRef}`
                          : t("practitioner.finance.settlements.pendingPayout")}
                      </Text>
                    </View>
                    <Text weight="600" style={styles.settlementAmount}>
                      {formatMoney(item.amountNet, item.currency, locale)}
                    </Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <StatusBadge
                      label={t(`practitioner.finance.settlements.statuses.${item.status}`, item.status)}
                      status={settlementStatusTone(item.status)}
                    />
                    <StatusBadge
                      label={t(`practitioner.finance.settlements.statuses.${item.batchStatus}`, item.batchStatus)}
                      status={settlementStatusTone(item.batchStatus)}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text color={theme.colors.textSecondary}>
              {t("practitioner.finance.settlements.emptyBody")}
            </Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.metricCard, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <Text color={theme.colors.textMuted} style={styles.metricLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    gap: 14,
  },
  heroTitle: {
    fontSize: 22,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  primaryBalance: {
    borderRadius: 18,
    padding: 18,
    gap: 6,
  },
  balanceLabel: {
    fontSize: 12,
  },
  balanceValue: {
    fontSize: 28,
  },
  balanceHint: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    borderRadius: 18,
    padding: 18,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listWrap: {
    gap: 10,
  },
  settlementRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  settlementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  settlementText: {
    flex: 1,
  },
  settlementTitle: {
    fontSize: 16,
  },
  settlementMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  settlementAmount: {
    fontSize: 16,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
