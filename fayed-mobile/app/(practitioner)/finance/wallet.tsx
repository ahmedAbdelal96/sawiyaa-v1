import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  formatDateShort,
  formatMoney,
  monthYearLabel,
  settlementStatusLabel,
  settlementStatusTone,
} from "../../../src/features/practitioner/finance/utils";
import type { PractitionerSettlementItem } from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import {
  CompactActionLink,
  CompactEmptyState,
  CompactSectionHeader,
  resolvePractitionerTone,
} from "../../../src/features/practitioner/ui/compact";

const PREVIEW_LIMIT = 3;

export default function PractitionerWalletScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const walletQuery = usePractitionerWalletSummary();
  const settlementsQuery = usePractitionerSettlementItems({
    page: 1,
    limit: PREVIEW_LIMIT,
  });

  const wallet = walletQuery.data?.item ?? null;
  const recentSettlements = settlementsQuery.data?.items.slice(0, 3) ?? [];

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
          <TouchableOpacity onPress={() => walletQuery.refetch()} style={styles.headerAction}>
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="outlined" padding="sm" style={styles.summaryCard}>
          <CompactSectionHeader
            title={t("practitioner.finance.wallet.summary")}
            subtitle={t("practitioner.finance.wallet.balanceHint")}
          />

          <View style={styles.balanceBlock}>
            <Text color={theme.colors.textMuted} style={styles.balanceLabel}>
              {t("practitioner.finance.wallet.available")}
            </Text>
            <Text weight="700" style={styles.balanceValue}>
              {formatMoney(
                wallet?.availableBalance ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            </Text>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              tone="warning"
              label={t("practitioner.finance.wallet.pending")}
              hint={t("practitioner.finance.wallet.hints.pending")}
              value={formatMoney(
                wallet?.pendingBalance ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            />
            <MetricCard
              tone="neutral"
              label={t("practitioner.finance.wallet.reserved")}
              hint={t("practitioner.finance.wallet.hints.reserved")}
              value={formatMoney(
                wallet?.reservedBalance ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            />
            <MetricCard
              tone="success"
              label={t("practitioner.finance.wallet.totalEarned")}
              hint={t("practitioner.finance.wallet.hints.totalEarned")}
              value={formatMoney(
                wallet?.totalEarned ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            />
            <MetricCard
              tone="info"
              label={t("practitioner.finance.wallet.lifetimePaidOut")}
              hint={t("practitioner.finance.wallet.hints.lifetimePaidOut")}
              value={formatMoney(
                wallet?.lifetimePaidOut ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            />
          </View>

          <View style={styles.detailRows}>
            <DetailRow
              label={t("practitioner.finance.wallet.lastLedgerEntryAt")}
              value={formatDateShort(wallet?.lastLedgerEntryAt ?? null, locale)}
            />
            <DetailRow
              label={t("practitioner.finance.wallet.updatedAt")}
              value={formatDateShort(wallet?.updatedAt ?? null, locale)}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="sm">
          <CompactSectionHeader
            title={t("practitioner.finance.wallet.recentSettlements")}
            action={
              <CompactActionLink
                label={t("practitioner.finance.common.viewAll")}
                onPress={() => router.push("/(practitioner)/finance/settlements")}
              />
            }
          />
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
                <SettlementRow key={item.id} item={item} locale={locale} t={t} />
              ))}
            </View>
          ) : (
            <CompactEmptyState
              title={t("practitioner.finance.settlements.emptyTitle")}
              description={t("practitioner.finance.settlements.emptyBody")}
              icon={<Ionicons name="layers-outline" size={28} color={theme.colors.textMuted} />}
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function MetricCard({
  label,
  hint,
  value,
  tone = "neutral",
}: {
  label: string;
  hint: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text color={theme.colors.textMuted} style={styles.metricLabel}>
        {label}
      </Text>
      <Text weight="600" style={[styles.metricValue, { color: palette.accent }]}>
        {value}
      </Text>
      <Text color={theme.colors.textMuted} style={styles.metricHint}>
        {hint}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.detailRow, { borderColor: theme.colors.borderLight }]}>
      <Text color={theme.colors.textMuted} style={styles.detailLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SettlementRow({
  item,
  locale,
  t,
}: {
  item: PractitionerSettlementItem;
  locale: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(
    theme,
    item.status === "PAID"
      ? "success"
      : item.status === "FAILED" || item.status === "CANCELLED"
        ? "danger"
        : item.status === "READY" || item.status === "PROCESSING"
          ? "warning"
          : "neutral",
  );

  return (
    <View
      style={[
        styles.settlementRow,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.settlementTop}>
        <View style={styles.settlementText}>
          <Text weight="600" style={styles.settlementTitle} numberOfLines={1}>
            {monthYearLabel(item.batchPeriodYear, item.batchPeriodMonth, locale)}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.settlementMeta} numberOfLines={1}>
            {formatDateShort(item.paidAt ?? item.failedAt ?? item.createdAt, locale)}
          </Text>
        </View>
        <Text weight="600" style={[styles.settlementAmount, { color: palette.accent }]}>
          {formatMoney(
            item.amountNet,
            item.currency ?? null,
            locale,
            t("practitioner.finance.common.currencyUnavailable"),
          )}
        </Text>
      </View>

      <View style={styles.badgeRow}>
        <StatusBadge
          label={settlementStatusLabel(item.status, locale)}
          status={settlementStatusTone(item.status)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  headerAction: {
    padding: 8,
  },
  summaryCard: {
    gap: 10,
  },
  balanceBlock: {
    borderRadius: 16,
    paddingVertical: 8,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 10,
  },
  balanceValue: {
    fontSize: 20,
    lineHeight: 26,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metricCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
  },
  metricValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricHint: {
    fontSize: 9,
    lineHeight: 12,
  },
  detailRows: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 10,
    flex: 1,
  },
  detailValue: {
    fontSize: 11,
    flexShrink: 0,
    maxWidth: "58%",
    textAlign: "left",
  },
  listWrap: {
    gap: 6,
  },
  settlementRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    gap: 5,
  },
  settlementTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  settlementText: {
    flex: 1,
  },
  settlementTitle: {
    fontSize: 12,
  },
  settlementMeta: {
    fontSize: 9,
    marginTop: 1,
  },
  settlementAmount: {
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
});
