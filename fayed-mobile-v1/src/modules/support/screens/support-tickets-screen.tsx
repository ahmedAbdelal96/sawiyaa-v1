import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { SupportTicketCard } from "@/modules/support/components/support-ticket-card";
import { useSupportTickets } from "@/modules/support/hooks/use-support";
import { AppButton, AppCard, AppChip, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen } from "@/shared/ui";

const FILTER_OPTIONS = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
] as const;

type FilterStatus = (typeof FILTER_OPTIONS)[number];

export function SupportTicketsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing } = useAppTheme();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const ticketsQuery = useSupportTickets();

  const visibleTickets = useMemo(() => {
    const items = ticketsQuery.data?.items || [];
    if (filterStatus === "ALL") return items;
    return items.filter((ticket) => ticket.status === filterStatus);
  }, [ticketsQuery.data?.items, filterStatus]);

  if (ticketsQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (ticketsQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => ticketsQuery.refetch()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("supportTicketsTitle")} subtitle={t("supportTicketsSubtitle")} />
        <AppButton
          label={t("supportCreateTicket")}
          onPress={() => router.push(routes.app.supportNewTicket)}
        />
        <AppCard style={{ backgroundColor: "rgba(242,244,246,0.75)" }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {FILTER_OPTIONS.map((status) => (
              <AppChip
                key={status}
                label={status === "ALL" ? t("supportFilterAll") : t(`supportStatus_${status}`)}
                selected={filterStatus === status}
                onPress={() => setFilterStatus(status)}
              />
            ))}
          </View>
        </AppCard>
        {visibleTickets.length === 0 ? (
          <AppEmptyState
            title={t("supportEmptyTitle")}
            description={t("supportEmptyDescription")}
          />
        ) : (
          visibleTickets.map((ticket) => (
            <SupportTicketCard key={ticket.id} ticket={ticket} />
          ))
        )}
      </View>
    </AppScreen>
  );
}
