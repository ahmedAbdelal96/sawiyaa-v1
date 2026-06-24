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
  usePractitionerLedgerEntries,
  usePractitionerSettlementItems,
  usePractitionerWalletSummary,
} from "../../../src/features/practitioner/finance/hooks";
import {
  formatDateShort,
  formatMoney,
  formatSignedMoney,
  ledgerBucketLabel,
  ledgerEntryTypeLabel,
  monthYearLabel,
  safeFinanceText,
  settlementStatusLabel,
  settlementStatusTone,
} from "../../../src/features/practitioner/finance/utils";
import type {
  PractitionerLedgerEntry,
  PractitionerSettlementItem,
} from "../../../src/features/practitioner/finance/types";
import {
  CompactActionLink,
  CompactEmptyState,
  CompactSectionHeader,
  resolvePractitionerTone,
} from "../../../src/features/practitioner/ui/compact";
import { useTheme } from "../../../src/providers/ThemeProvider";

const PREVIEW_LIMIT = 3;
type TranslateFn = ReturnType<typeof useTranslation>["t"];

export default function PractitionerFinanceOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const walletQuery = usePractitionerWalletSummary();
  const ledgerQuery = usePractitionerLedgerEntries({
    page: 1,
    limit: PREVIEW_LIMIT,
  });
  const settlementsQuery = usePractitionerSettlementItems({
    page: 1,
    limit: PREVIEW_LIMIT,
  });

  const wallet = walletQuery.data?.item ?? null;
  const recentLedgerItems = ledgerQuery.data?.items.slice(0, 3) ?? [];
  const recentSettlements = settlementsQuery.data?.items.slice(0, 2) ?? [];
  const financeTone = resolvePractitionerTone(theme, "finance");

  const refetchAll = () => {
    walletQuery.refetch();
    ledgerQuery.refetch();
    settlementsQuery.refetch();
  };

  const isInitialLoading =
    walletQuery.isLoading && ledgerQuery.isLoading && settlementsQuery.isLoading;

  if (isInitialLoading) {
    return (
      <Screen bg="background">
        <Header
          title={t("practitioner.finance.title")}
          rightElement={
            <TouchableOpacity onPress={refetchAll} style={styles.headerAction}>
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (walletQuery.isError) {
    return (
      <Screen bg="background">
        <Header
          title={t("practitioner.finance.title")}
          rightElement={
            <TouchableOpacity onPress={refetchAll} style={styles.headerAction}>
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.wallet.errorTitle")}
          message={t("practitioner.finance.wallet.errorBody")}
          onRetry={refetchAll}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.finance.title")}
        rightElement={
          <TouchableOpacity onPress={refetchAll} style={styles.headerAction}>
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="outlined" padding="sm" style={styles.snapshotCard}>
          <View style={styles.snapshotHeader}>
            <View style={styles.snapshotHeaderText}>
              <Text weight="600" style={styles.snapshotTitle}>
                {t("practitioner.finance.summary.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.snapshotSubtitle}>
                {t("practitioner.finance.summary.subtitle")}
              </Text>
            </View>
            <CompactActionLink
              label={t("practitioner.finance.common.viewAll")}
              onPress={() => router.push("/(practitioner)/finance/wallet")}
            />
          </View>

          <View
            style={[
              styles.balanceShell,
              { backgroundColor: financeTone.surface, borderColor: financeTone.border },
            ]}
          >
            <Text color={theme.colors.textMuted} style={styles.balanceLabel}>
              {t("practitioner.finance.wallet.available")}
            </Text>
            <Text weight="700" style={[styles.balanceValue, { color: financeTone.accent }]}>
              {formatMoney(
                wallet?.availableBalance ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.balanceHint}>
              {t("practitioner.finance.summary.balanceHint")}
            </Text>
          </View>

          <View style={styles.metricGrid}>
            <MetricTile
              label={t("practitioner.finance.wallet.pending")}
              value={formatMoney(
                wallet?.pendingBalance ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
              tone="warning"
            />
            <MetricTile
              label={t("practitioner.finance.wallet.reserved")}
              value={formatMoney(
                wallet?.reservedBalance ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
              tone="neutral"
            />
            <MetricTile
              label={t("practitioner.finance.wallet.totalEarned")}
              value={formatMoney(
                wallet?.totalEarned ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
              tone="success"
            />
            <MetricTile
              label={t("practitioner.finance.wallet.lifetimePaidOut")}
              value={formatMoney(
                wallet?.lifetimePaidOut ?? "0",
                wallet?.currency ?? null,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
              tone="info"
            />
          </View>

          <View style={styles.detailRows}>
            <InlineRow
              label={t("practitioner.finance.wallet.lastLedgerEntryAt")}
              value={formatDateShort(wallet?.lastLedgerEntryAt ?? null, locale)}
            />
            <InlineRow
              label={t("practitioner.finance.wallet.updatedAt")}
              value={formatDateShort(wallet?.updatedAt ?? null, locale)}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="sm">
          <CompactSectionHeader title={t("practitioner.finance.quickActions")} />
          <View style={styles.actionGrid}>
            <ActionTile
              icon="wallet-outline"
              label={t("practitioner.finance.actions.wallet")}
              tone="finance"
              onPress={() => router.push("/(practitioner)/finance/wallet")}
            />
            <ActionTile
              icon="receipt-outline"
              label={t("practitioner.finance.actions.ledger")}
              tone="info"
              onPress={() => router.push("/(practitioner)/finance/ledger")}
            />
            <ActionTile
              icon="layers-outline"
              label={t("practitioner.finance.actions.settlements")}
              tone="warning"
              onPress={() => router.push("/(practitioner)/finance/settlements")}
            />
            <ActionTile
              icon="pricetag-outline"
              label={t("practitioner.finance.actions.promoCodes")}
              tone="success"
              onPress={() => router.push("/(practitioner)/promo-codes")}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="sm">
          <CompactSectionHeader
            title={t("practitioner.finance.ledger.recentTitle")}
            action={
              <CompactActionLink
                label={t("practitioner.finance.common.viewAll")}
                onPress={() => router.push("/(practitioner)/finance/ledger")}
              />
            }
          />
          {ledgerQuery.isLoading ? (
            <LoadingState message={t("practitioner.finance.common.loading")} />
          ) : ledgerQuery.isError ? (
            <ErrorState
              title={t("practitioner.finance.ledger.errorTitle")}
              message={t("practitioner.finance.ledger.errorBody")}
              onRetry={ledgerQuery.refetch}
            />
          ) : recentLedgerItems.length ? (
            <View style={styles.previewList}>
              {recentLedgerItems.map((item) => (
                <LedgerPreviewRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  onPress={() => router.push("/(practitioner)/finance/ledger")}
                />
              ))}
            </View>
          ) : (
            <CompactEmptyState
              title={t("practitioner.finance.ledger.emptyTitle")}
              description={t("practitioner.finance.ledger.emptyBody")}
              icon={<Ionicons name="receipt-outline" size={28} color={theme.colors.textMuted} />}
            />
          )}
        </Card>

        <Card variant="outlined" padding="sm">
          <CompactSectionHeader
            title={t("practitioner.finance.settlements.recentTitle")}
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
            <View style={styles.previewList}>
              {recentSettlements.map((item) => (
                <SettlementPreviewRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  t={t}
                  onPress={() => router.push("/(practitioner)/finance/settlements")}
                />
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

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <View
      style={[
        styles.metricTile,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <Text color={theme.colors.textMuted} style={styles.metricLabel}>
        {label}
      </Text>
      <Text weight="600" style={[styles.metricValue, { color: palette.accent }]}>
        {value}
      </Text>
    </View>
  );
}

function InlineRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.inlineRow, { borderColor: theme.colors.borderLight }]}>
      <Text color={theme.colors.textMuted} style={styles.inlineLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.inlineValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionTile({
  icon,
  label,
  tone = "neutral",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "finance" | "info" | "warning" | "neutral" | "success";
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <TouchableOpacity
      style={[
        styles.actionTile,
        {
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.actionIcon, { backgroundColor: palette.iconBackground }]}>
        <Ionicons name={icon} size={18} color={palette.iconColor} />
      </View>
      <Text weight="600" style={styles.actionLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LedgerPreviewRow({
  item,
  locale,
  onPress,
}: {
  item: PractitionerLedgerEntry;
  locale: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const tone =
    item.direction === "DEBIT"
      ? "danger"
      : item.entryType.includes("SETTLEMENT")
        ? "info"
        : "success";
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.previewRow,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.previewTop}>
        <View style={styles.previewText}>
          <Text weight="600" style={styles.previewTitle} numberOfLines={1}>
            {safeFinanceText(
              item.description,
              ledgerEntryTypeLabel(item.entryType, locale),
            )}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.previewMeta} numberOfLines={1}>
            {formatDateShort(item.effectiveAt, locale)} · {ledgerBucketLabel(item.balanceBucket, locale)}
          </Text>
        </View>
        <Text weight="600" style={[styles.previewAmount, { color: palette.accent }]}>
          {formatSignedMoney(item.amount, item.currency, locale)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SettlementPreviewRow({
  item,
  locale,
  t,
  onPress,
}: {
  item: PractitionerSettlementItem;
  locale: string;
  t: TranslateFn;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const rowTone =
    item.status === "PAID"
      ? "success"
      : item.status === "FAILED" || item.status === "CANCELLED"
        ? "danger"
        : item.status === "READY" || item.status === "PROCESSING"
          ? "warning"
          : "info";
  const palette = resolvePractitionerTone(theme, rowTone);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.previewRow,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.previewTop}>
        <View style={styles.previewText}>
          <Text weight="600" style={styles.previewTitle} numberOfLines={1}>
            {monthYearLabel(item.batchPeriodYear, item.batchPeriodMonth, locale)}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.previewMeta} numberOfLines={1}>
            {formatDateShort(item.paidAt ?? item.failedAt ?? item.createdAt, locale)}
          </Text>
        </View>
        <Text weight="600" style={[styles.previewAmount, { color: palette.accent }]}>
          {formatMoney(
            item.amountNet,
            item.currency ?? null,
            locale,
            t("practitioner.finance.common.currencyUnavailable"),
          )}
        </Text>
      </View>
      <View style={styles.previewBadges}>
        <StatusBadge
          label={settlementStatusLabel(item.status, locale)}
          status={settlementStatusTone(item.status)}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 9,
  },
  headerAction: {
    padding: 8,
  },
  snapshotCard: {
    gap: 8,
  },
  snapshotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  snapshotHeaderText: {
    flex: 1,
    gap: 1,
  },
  snapshotTitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  snapshotSubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  balanceShell: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 10,
  },
  balanceValue: {
    fontSize: 20,
    lineHeight: 26,
  },
  balanceHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  metricTile: {
    width: "48%",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
  },
  metricValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  detailRows: {
    gap: 5,
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  inlineLabel: {
    fontSize: 10,
    flex: 1,
  },
  inlineValue: {
    fontSize: 11,
    flexShrink: 0,
    maxWidth: "58%",
    textAlign: "left",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  actionTile: {
    width: "48%",
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    padding: 9,
    gap: 7,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewList: {
    gap: 5,
  },
  previewRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
    gap: 4,
  },
  previewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  previewText: {
    flex: 1,
    gap: 1,
  },
  previewTitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewMeta: {
    fontSize: 8,
    lineHeight: 12,
  },
  previewAmount: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  previewFooter: {
    fontSize: 8,
    lineHeight: 12,
  },
});
