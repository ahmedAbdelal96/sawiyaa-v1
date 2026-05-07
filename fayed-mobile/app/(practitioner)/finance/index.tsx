import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  EmptyState,
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
  directionTone,
  formatDateShort,
  formatMoney,
  ledgerTypeTone,
  monthYearLabel,
  settlementStatusTone,
  shortId,
} from "../../../src/features/practitioner/finance/utils";
import type {
  PractitionerLedgerEntry,
  PractitionerSettlementItem,
} from "../../../src/features/practitioner/finance/types";
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
  const recentLedgerItems = ledgerQuery.data?.items ?? [];
  const recentSettlements = settlementsQuery.data?.items ?? [];

  if (walletQuery.isLoading && ledgerQuery.isLoading && settlementsQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.title")} />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (walletQuery.isError) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.title")} />
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
      <Header title={t("practitioner.finance.title")} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text weight="bold" style={styles.heroTitle}>
                {t("practitioner.finance.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {t("practitioner.finance.subtitle")}
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="cash-outline" size={24} color={theme.colors.primary} />
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label={t("practitioner.finance.wallet.available")}
              value={formatMoney(wallet?.availableBalance ?? "0", wallet?.currency ?? "EGP", locale)}
            />
            <MetricCard
              label={t("practitioner.finance.wallet.totalEarned")}
              value={formatMoney(wallet?.totalEarned ?? "0", wallet?.currency ?? "EGP", locale)}
            />
            <MetricCard
              label={t("practitioner.finance.wallet.lifetimePaidOut")}
              value={formatMoney(wallet?.lifetimePaidOut ?? "0", wallet?.currency ?? "EGP", locale)}
            />
            <MetricCard
              label={t("practitioner.finance.wallet.pending")}
              value={formatMoney(wallet?.pendingBalance ?? "0", wallet?.currency ?? "EGP", locale)}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="lg">
          <Text weight="600" style={styles.sectionTitle}>
            {t("practitioner.finance.quickActions")}
          </Text>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="wallet-outline"
              label={t("practitioner.finance.wallet.title")}
              onPress={() => router.push("/(practitioner)/finance/wallet")}
            />
            <QuickAccessCard
              icon="receipt-outline"
              label={t("practitioner.finance.ledger.title")}
              onPress={() => router.push("/(practitioner)/finance/ledger")}
            />
          </View>
          <View style={styles.quickGrid}>
            <QuickAccessCard
              icon="layers-outline"
              label={t("practitioner.finance.settlements.title")}
              onPress={() => router.push("/(practitioner)/finance/settlements")}
            />
            <QuickAccessCard
              icon="refresh-outline"
              label={t("practitioner.finance.common.refresh")}
              onPress={() => {
                walletQuery.refetch();
                ledgerQuery.refetch();
                settlementsQuery.refetch();
              }}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="lg">
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("practitioner.finance.ledger.recentTitle")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(practitioner)/finance/ledger")}>
              <Text color={theme.colors.textBrand} weight="600">
                {t("practitioner.finance.common.viewAll")}
              </Text>
            </TouchableOpacity>
          </View>
          {ledgerQuery.isLoading ? (
            <LoadingState message={t("practitioner.finance.common.loading")} />
          ) : ledgerQuery.isError ? (
            <ErrorState
              title={t("practitioner.finance.ledger.errorTitle")}
              message={t("practitioner.finance.ledger.errorBody")}
              onRetry={ledgerQuery.refetch}
            />
          ) : recentLedgerItems.length ? (
            <View style={styles.listWrap}>
              {recentLedgerItems.map((item) => (
                <LedgerPreviewRow key={item.id} item={item} locale={locale} t={t} />
              ))}
            </View>
          ) : (
            <EmptyState
              title={t("practitioner.finance.ledger.emptyTitle")}
              description={t("practitioner.finance.ledger.emptyBody")}
              icon={<Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} />}
            />
          )}
        </Card>

        <Card variant="outlined" padding="lg">
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("practitioner.finance.settlements.recentTitle")}
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
                <SettlementPreviewRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  t={t}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title={t("practitioner.finance.settlements.emptyTitle")}
              description={t("practitioner.finance.settlements.emptyBody")}
              icon={<Ionicons name="layers-outline" size={48} color={theme.colors.textMuted} />}
            />
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

function QuickAccessCard({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.quickCard, { borderColor: theme.colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <Text weight="600" style={styles.quickCardLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LedgerPreviewRow({
  item,
  locale,
  t,
}: {
  item: PractitionerLedgerEntry;
  locale: string;
  t: TranslateFn;
}) {
  const { theme } = useTheme();
  const amount = formatMoney(item.amount, item.currency, locale);

  return (
    <Card variant="flat" padding="md" style={styles.previewRowCard}>
      <View style={styles.previewRowTop}>
        <View style={styles.previewRowText}>
          <Text weight="600" style={styles.previewTitle} numberOfLines={1}>
            {item.description ?? item.entryType}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.previewSubtitle}>
            {formatDateShort(item.effectiveAt, locale)}
          </Text>
        </View>
        <Text weight="600" style={styles.previewAmount}>
          {item.direction === "DEBIT" ? "-" : "+"}
          {amount}
        </Text>
      </View>
      <View style={styles.badgeRow}>
        <StatusBadge
          label={t(`practitioner.finance.ledger.entryTypes.${item.entryType}`, item.entryType)}
          status={ledgerTypeTone(item.entryType)}
        />
        <StatusBadge
          label={t(`practitioner.finance.ledger.directions.${item.direction}`, item.direction)}
          status={directionTone(item.direction)}
        />
      </View>
      <Text color={theme.colors.textSecondary} style={styles.previewMeta}>
        {item.paymentId
          ? `${shortId(item.paymentId)} • ${item.balanceBucket}`
          : item.settlementId
            ? `${shortId(item.settlementId)} • ${item.balanceBucket}`
            : `${item.balanceBucket}`}
      </Text>
    </Card>
  );
}

function SettlementPreviewRow({
  item,
  locale,
  t,
}: {
  item: PractitionerSettlementItem;
  locale: string;
  t: TranslateFn;
}) {
  const { theme } = useTheme();

  return (
    <Card variant="flat" padding="md" style={styles.previewRowCard}>
      <View style={styles.previewRowTop}>
        <View style={styles.previewRowText}>
          <Text weight="600" style={styles.previewTitle} numberOfLines={1}>
            {monthYearLabel(item.batchPeriodYear, item.batchPeriodMonth, locale)}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.previewSubtitle}>
            {formatDateShort(item.createdAt, locale)}
          </Text>
        </View>
        <Text weight="600" style={styles.previewAmount}>
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
      <Text color={theme.colors.textSecondary} style={styles.previewMeta}>
        {item.externalPayoutRef
          ? `${t("practitioner.finance.settlements.receivedRef", "Received ref")}: ${shortId(item.externalPayoutRef)} • ${item.paidAt ? formatDateShort(item.paidAt, locale) : "—"}`
          : item.failedAt
            ? `${t("practitioner.finance.settlements.failedAt", "Failed at")}: ${formatDateShort(item.failedAt, locale)}`
            : t("practitioner.finance.settlements.pendingPayout", "Waiting for payout")}
      </Text>
    </Card>
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
    gap: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  quickCard: {
    flex: 1,
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    justifyContent: "space-between",
  },
  quickCardLabel: {
    fontSize: 14,
  },
  listWrap: {
    gap: 10,
  },
  previewRowCard: {
    gap: 10,
  },
  previewRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  previewRowText: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
  },
  previewSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  previewAmount: {
    fontSize: 16,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  previewMeta: {
    fontSize: 12,
  },
});
