import { ScrollView } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import type { Specialty } from "@/modules/practitioners/domain/practitioners.types";
import { AppChip } from "@/shared/ui";

type SpecialtyChipRowProps = {
  specialties: Specialty[];
  selectedSlug?: string;
  onSelect: (slug?: string) => void;
  allLabel: string;
};

export function SpecialtyChipRow({
  specialties,
  selectedSlug,
  onSelect,
  allLabel,
}: SpecialtyChipRowProps) {
  const { spacing } = useAppTheme();

  return (
    <ScrollView
      horizontal
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
      showsHorizontalScrollIndicator={false}
    >
      <AppChip label={allLabel} selected={!selectedSlug} onPress={() => onSelect(undefined)} />
      {specialties.map((specialty) => (
        <AppChip
          key={specialty.id}
          label={specialty.name || specialty.slug}
          selected={selectedSlug === specialty.slug}
          onPress={() => onSelect(specialty.slug)}
        />
      ))}
    </ScrollView>
  );
}
