import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { z } from "zod";

import { useAppTheme } from "@/core/theme/theme-provider";
import { useCreateMatchingSession } from "@/modules/matching/hooks/use-matching";
import { SpecialtyChipRow } from "@/modules/practitioners/components/specialty-chip-row";
import { useSpecialties } from "@/modules/practitioners/hooks/use-specialties";
import {
  AppButton,
  AppCard,
  AppChip,
  AppErrorState,
  AppHeader,
  AppInput,
  AppScreen,
} from "@/shared/ui";

const matchingSchema = z.object({
  primaryConcern: z.string().max(200).optional(),
  preferredSpecialtySlug: z.string().optional(),
  preferredLanguage: z.enum(["ar", "en"]),
  sessionMode: z.enum(["VIDEO", "AUDIO"]),
  urgency: z.enum(["FLEXIBLE", "EARLIEST_AVAILABLE", "AVAILABLE_NOW"]),
});

type MatchingFormValues = z.infer<typeof matchingSchema>;

export function MatchingEntryScreen() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const specialtiesQuery = useSpecialties();
  const createMutation = useCreateMatchingSession();
  const { control, handleSubmit, watch, setValue } = useForm<MatchingFormValues>({
    resolver: zodResolver(matchingSchema),
    defaultValues: {
      primaryConcern: "",
      preferredSpecialtySlug: undefined,
      preferredLanguage: "ar",
      sessionMode: "VIDEO",
      urgency: "FLEXIBLE",
    },
  });

  const selectedSpecialty = watch("preferredSpecialtySlug");
  const selectedSessionMode = watch("sessionMode");
  const selectedUrgency = watch("urgency");

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("matchingTitle")} subtitle={t("matchingSubtitle")} />

        <AppCard>
          <View style={{ gap: spacing.lg }}>
            <Controller
              control={control}
              name="primaryConcern"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("matchingPrimaryConcern")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  multiline
                  numberOfLines={4}
                />
              )}
            />

            {specialtiesQuery.data ? (
              <View style={{ gap: spacing.sm }}>
                <SpecialtyChipRow
                  specialties={specialtiesQuery.data}
                  selectedSlug={selectedSpecialty}
                  onSelect={(value) => setValue("preferredSpecialtySlug", value)}
                  allLabel={t("specialtyAny")}
                />
              </View>
            ) : null}

            <View style={{ gap: spacing.sm }}>
              <Controller
                control={control}
                name="preferredLanguage"
                render={({ field }) => (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <AppChip
                      label={t("languageArabic")}
                      selected={field.value === "ar"}
                      onPress={() => field.onChange("ar")}
                    />
                    <AppChip
                      label={t("languageEnglish")}
                      selected={field.value === "en"}
                      onPress={() => field.onChange("en")}
                    />
                  </View>
                )}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Controller
                control={control}
                name="sessionMode"
                render={({ field }) => (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <AppChip
                      label={t("sessionModeVideo")}
                      selected={selectedSessionMode === "VIDEO"}
                      onPress={() => field.onChange("VIDEO")}
                    />
                    <AppChip
                      label={t("sessionModeAudio")}
                      selected={selectedSessionMode === "AUDIO"}
                      onPress={() => field.onChange("AUDIO")}
                    />
                  </View>
                )}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Controller
                control={control}
                name="urgency"
                render={({ field }) => (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                    <AppChip
                      label={t("urgencyFlexible")}
                      selected={selectedUrgency === "FLEXIBLE"}
                      onPress={() => field.onChange("FLEXIBLE")}
                    />
                    <AppChip
                      label={t("urgencyEarliest")}
                      selected={selectedUrgency === "EARLIEST_AVAILABLE"}
                      onPress={() => field.onChange("EARLIEST_AVAILABLE")}
                    />
                    <AppChip
                      label={t("urgencyNow")}
                      selected={selectedUrgency === "AVAILABLE_NOW"}
                      onPress={() => field.onChange("AVAILABLE_NOW")}
                    />
                  </View>
                )}
              />
            </View>

            <AppButton
              label={t("matchingCreate")}
              loading={createMutation.isPending}
              onPress={handleSubmit((values) =>
                createMutation.mutate({
                  ...values,
                  primaryConcern: values.primaryConcern?.trim() || undefined,
                  preferredSpecialtySlug: values.preferredSpecialtySlug || undefined,
                }),
              )}
            />
            {createMutation.isError ? <AppErrorState /> : null}
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}
