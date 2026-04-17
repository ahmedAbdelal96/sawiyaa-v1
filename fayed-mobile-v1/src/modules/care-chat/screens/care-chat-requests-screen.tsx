import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { CareChatRequestCard } from "@/modules/care-chat/components/care-chat-request-card";
import { useCareChatRequests } from "@/modules/care-chat/hooks/use-care-chat";
import { AppButton, AppCard, AppChip, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen } from "@/shared/ui";

const FILTER_OPTIONS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

type FilterStatus = (typeof FILTER_OPTIONS)[number];

export function CareChatRequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing } = useAppTheme();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const requestsQuery = useCareChatRequests();

  const visibleItems = useMemo(() => {
    const items = requestsQuery.data?.items || [];
    if (filterStatus === "ALL") return items;
    return items.filter((item) => item.status === filterStatus);
  }, [requestsQuery.data?.items, filterStatus]);

  if (requestsQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (requestsQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => requestsQuery.refetch()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("careChatRequestsTitle")} subtitle={t("careChatRequestsSubtitle")} />
        <AppButton
          label={t("careChatCreateRequest")}
          onPress={() => router.push(routes.app.careChatNewRequest)}
        />
        <AppCard style={{ backgroundColor: "rgba(242,244,246,0.75)" }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {FILTER_OPTIONS.map((status) => (
              <AppChip
                key={status}
                label={status === "ALL" ? t("careChatFilterAll") : t(`careChatStatus_${status}`)}
                selected={filterStatus === status}
                onPress={() => setFilterStatus(status)}
              />
            ))}
          </View>
        </AppCard>
        {visibleItems.length === 0 ? (
          <AppEmptyState
            title={t("careChatEmptyTitle")}
            description={t("careChatEmptyDescription")}
          />
        ) : (
          visibleItems.map((request) => (
            <CareChatRequestCard key={request.id} request={request} />
          ))
        )}
      </View>
    </AppScreen>
  );
}
