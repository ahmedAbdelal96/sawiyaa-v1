import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
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
} from "../../../src/components/ui";
import {
  usePractitionerSettlementItems,
} from "../../../src/features/practitioner/finance/hooks";
import {
  formatDateShort,
  formatMoney,
  monthYearLabel,
  settlementStatusTone,
  shortId,
} from "../../../src/features/practitioner/finance/utils";
import type { PractitionerSettlementItem } from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";

const PAGE_SIZE = 20;

export default function PractitionerSettlementsScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [page, setPage] = useState(1);
  const query = usePractitionerSettlementItems({ page, limit: PAGE_SIZE });
  const [items, setItems] = useState<PractitionerSettlementItem[]>([]);

  useEffect(() => {
    if (!query.data) return;
    setItems((current) => {
      if (page === 1) {
        return query.data.items;
      }
      const seen = new Set(current.map((item) => item.id));
      const next = [...current];
      for (const item of query.data.items) {
        if (!seen.has(item.id)) next.push(item);
      }
      return next;
    });
  }, [page, query.data]);

  const hasMore = useMemo(() => {
    if (!query.data) return false;
    return page < query.data.pagination.totalPages;
  }, [page, query.data]);

  const refresh = () => {
    setPage(1);
    query.refetch();
  };

  if (query.isLoading && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.settlements.title")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (query.isError && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.settlements.title")} showBack />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.settlements.errorTitle")}
          message={t("practitioner.finance.settlements.errorBody")}
          onRetry={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.finance.settlements.title")}
        showBack
        rightElement={
          <TouchableOpacity onPress={refresh}>
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <Text weight="bold" style={styles.heroTitle}>
            {t("practitioner.finance.settlements.title")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
            {t("practitioner.finance.settlements.subtitle")}
          </Text>
        </Card>

        {items.length ? (
          <View style={styles.listWrap}>
            {items.map((item) => (
              <SettlementRow key={item.id} item={item} locale={locale} t={t} />
            ))}
          </View>
        ) : (
          <EmptyState
            title={t("practitioner.finance.settlements.emptyTitle")}
            description={t("practitioner.finance.settlements.emptyBody")}
            icon={<Ionicons name="layers-outline" size={48} color={theme.colors.textMuted} />}
          />
        )}

        {hasMore ? (
          <Button
            title={query.isFetching ? t("practitioner.finance.common.loadingMore") : t("practitioner.finance.common.loadMore")}
            onPress={() => setPage((current) => current + 1)}
            variant="secondary"
            disabled={query.isFetching}
          />
        ) : null}
      </ScrollView>
    </Screen>
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

  return (
    <Card variant="flat" padding="md" style={styles.rowCard}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Text weight="600" style={styles.rowTitle} numberOfLines={1}>
            {monthYearLabel(item.batchPeriodYear, item.batchPeriodMonth, locale)}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.rowSubtitle}>
            {tPayoutInfo(item, locale)}
          </Text>
        </View>
        <Text weight="600" style={styles.rowAmount}>
          {formatMoney(item.amountNet, item.currency, locale)}
        </Text>
      </View>

      <View style={styles.amountRow}>
        <AmountPill
          label={locale.startsWith("ar") ? "إجمالي" : "Gross"}
          value={formatMoney(item.amountGross, item.currency, locale)}
        />
        <AmountPill
          label={locale.startsWith("ar") ? "تعديلات" : "Adjustments"}
          value={formatMoney(item.amountAdjustments, item.currency, locale)}
        />
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

      <Text color={theme.colors.textSecondary} style={styles.metaLine}>
        {item.externalPayoutRef
          ? `${t("practitioner.finance.settlements.receivedRef")}: ${shortId(item.externalPayoutRef)}`
          : item.failedAt
            ? `${t("practitioner.finance.settlements.failedAt")}: ${formatDateShort(item.failedAt, locale)}`
            : t("practitioner.finance.settlements.pendingPayout")}
      </Text>
      <Text color={theme.colors.textSecondary} style={styles.metaLine}>
        {item.paidAt
          ? `${t("practitioner.finance.settlements.paidAt")}: ${formatDateShort(item.paidAt, locale)}`
          : `${t("practitioner.finance.settlements.createdAt")}: ${formatDateShort(item.createdAt, locale)}`}
      </Text>
    </Card>
  );
}

function AmountPill({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.amountPill, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <Text color={theme.colors.textMuted} style={styles.amountLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.amountValue}>
        {value}
      </Text>
    </View>
  );
}

function tPayoutInfo(item: PractitionerSettlementItem, locale: string) {
  if (item.externalPayoutRef) {
    return locale.startsWith("ar")
      ? `تم السداد بالفعل`
      : "Already paid";
  }
  if (item.failedAt) {
    return locale.startsWith("ar") ? "فشلت عملية الصرف" : "Payout failed";
  }
  return locale.startsWith("ar") ? "في انتظار السداد" : "Waiting for payout";
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    gap: 10,
  },
  heroTitle: {
    fontSize: 22,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  listWrap: {
    gap: 10,
  },
  rowCard: {
    gap: 10,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  rowAmount: {
    fontSize: 16,
  },
  amountRow: {
    flexDirection: "row",
    gap: 12,
  },
  amountPill: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaLine: {
    fontSize: 12,
  },
});
