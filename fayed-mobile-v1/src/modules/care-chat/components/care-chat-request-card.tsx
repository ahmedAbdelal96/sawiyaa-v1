import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import type { CareChatRequestItem } from "@/modules/care-chat/domain/care-chat.types";
import { AppButton, AppCard, AppText, StatusBadge } from "@/shared/ui";

type CareChatRequestCardProps = {
  request: CareChatRequestItem;
};

export function CareChatRequestCard({ request }: CareChatRequestCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();

  const statusTone =
    request.status === "APPROVED"
      ? "success"
      : request.status === "REJECTED" || request.status === "REVOKED"
        ? "danger"
        : request.status === "PENDING"
          ? "warning"
          : "neutral";

  return (
    <AppCard style={{ backgroundColor: colors.surfaceLowest }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" style={{ fontWeight: "800" }}>
          {request.practitioner.displayName || "-"}
        </AppText>
        <StatusBadge label={t(`careChatStatus_${request.status}`)} tone={statusTone} />
        {request.reason ? <AppText color={colors.textSecondary}>{request.reason}</AppText> : null}
        <AppButton
          label={t("careChatOpenRequest")}
          onPress={() => router.push(routes.app.careChatRequestDetails(request.id))}
          variant="secondary"
        />
      </View>
    </AppCard>
  );
}
