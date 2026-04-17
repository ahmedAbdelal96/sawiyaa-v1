import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import type { SupportTicketItem } from "@/modules/support/domain/support.types";
import { AppButton, AppCard, AppText, StatusBadge } from "@/shared/ui";

type SupportTicketCardProps = {
  ticket: SupportTicketItem;
};

export function SupportTicketCard({ ticket }: SupportTicketCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();

  const statusTone =
    ticket.status === "RESOLVED" || ticket.status === "CLOSED"
      ? "success"
      : ticket.status === "ESCALATED"
        ? "warning"
        : ticket.status === "WAITING_FOR_USER"
          ? "info"
          : "neutral";

  return (
    <AppCard style={{ backgroundColor: colors.surfaceLowest }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" style={{ fontWeight: "800" }}>
          {ticket.subject}
        </AppText>
        <AppText color={colors.textSecondary}>{t(`supportCategory_${ticket.category}`)}</AppText>
        <StatusBadge label={t(`supportStatus_${ticket.status}`)} tone={statusTone} />
        <AppButton
          label={t("supportOpenTicket")}
          onPress={() => router.push(routes.app.supportTicketDetails(ticket.id))}
          variant="secondary"
        />
      </View>
    </AppCard>
  );
}
