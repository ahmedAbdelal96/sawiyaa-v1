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
  usePractitionerLedgerEntries,
} from "../../../src/features/practitioner/finance/hooks";
import {
  directionTone,
  formatDateShort,
  formatMoney,
  ledgerTypeTone,
  shortId,
} from "../../../src/features/practitioner/finance/utils";
import type { PractitionerLedgerEntry } from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";

const PAGE_SIZE = 20;

export default function PractitionerLedgerScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [page, setPage] = useState(1);
  const query = usePractitionerLedgerEntries({ page, limit: PAGE_SIZE });
  const [items, setItems] = useState<PractitionerLedgerEntry[]>([]);

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

  const loadMore = () => setPage((current) => current + 1);

  const refresh = () => {
    setPage(1);
    query.refetch();
  };

  if (query.isLoading && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.ledger.title")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (query.isError && page === 1) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.ledger.title")} showBack />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.ledger.errorTitle")}
          message={t("practitioner.finance.ledger.errorBody")}
          onRetry={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.finance.ledger.title")}
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
            {t("practitioner.finance.ledger.title")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
            {t("practitioner.finance.ledger.subtitle")}
          </Text>
        </Card>

        {items.length ? (
          <View style={styles.listWrap}>
              {items.map((item) => (
              <LedgerRow key={item.id} item={item} locale={locale} t={t} />
              ))}
          </View>
        ) : (
          <EmptyState
            title={t("practitioner.finance.ledger.emptyTitle")}
            description={t("practitioner.finance.ledger.emptyBody")}
            icon={<Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} />}
          />
        )}

        {hasMore ? (
          <Button
            title={query.isFetching ? t("practitioner.finance.common.loadingMore") : t("practitioner.finance.common.loadMore")}
            onPress={loadMore}
            variant="secondary"
            disabled={query.isFetching}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function LedgerRow({
  item,
  locale,
  t,
}: {
  item: PractitionerLedgerEntry;
  locale: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const { theme } = useTheme();

  return (
    <Card variant="flat" padding="md" style={styles.rowCard}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Text weight="600" style={styles.rowTitle} numberOfLines={1}>
            {item.description ?? item.entryType}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.rowSubtitle}>
            {formatDateShort(item.effectiveAt, locale)}
          </Text>
        </View>
        <Text weight="600" style={styles.rowAmount}>
          {item.direction === "DEBIT" ? "-" : "+"}
          {formatMoney(item.amount, item.currency, locale)}
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
      <Text color={theme.colors.textSecondary} style={styles.metaLine}>
        {item.sessionId
          ? `${shortId(item.sessionId)} • ${item.balanceBucket}`
          : item.paymentId
            ? `${shortId(item.paymentId)} • ${item.balanceBucket}`
            : item.settlementId
              ? `${shortId(item.settlementId)} • ${item.balanceBucket}`
              : `${item.balanceBucket}`}
      </Text>
      <Text color={theme.colors.textSecondary} style={styles.metaLine}>
        {formatDateShort(item.createdAt, locale)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaLine: {
    fontSize: 12,
  },
});
