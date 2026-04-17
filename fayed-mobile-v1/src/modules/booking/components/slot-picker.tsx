import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import type { AvailabilityWindow } from "@/modules/practitioners/domain/practitioners.types";
import { formatWindowRange } from "@/modules/practitioners/lib/date";
import { AppChip, AppEmptyState } from "@/shared/ui";

type SlotPickerProps = {
  slots: AvailabilityWindow[];
  selectedSlot?: string;
  onSelect: (startsAt: string) => void;
  locale: string;
};

export function SlotPicker({
  slots,
  selectedSlot,
  onSelect,
  locale,
}: SlotPickerProps) {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();

  if (slots.length === 0) {
    return (
      <AppEmptyState
        title={t("bookingNoSlotsTitle")}
        description={t("bookingNoSlotsDescription")}
      />
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {slots.slice(0, 24).map((slot) => (
        <AppChip
          key={`${slot.startsAt}-${slot.endsAt}`}
          label={formatWindowRange(slot.startsAt, slot.endsAt, locale)}
          selected={selectedSlot === slot.startsAt}
          onPress={() => onSelect(slot.startsAt)}
        />
      ))}
    </View>
  );
}
