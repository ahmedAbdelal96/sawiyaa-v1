import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { PractitionerListCard } from "@/modules/practitioners/components/practitioner-list-card";
import { usePractitioners } from "@/modules/practitioners/hooks/use-practitioners";
import { useSpecialties } from "@/modules/practitioners/hooks/use-specialties";
import { AppEmptyState, AppErrorState, AppInput, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function PractitionersScreen() {
  const { t } = useTranslation();
  const { spacing, colors } = useAppTheme();
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>();

  const specialtiesQuery = useSpecialties();
  const filters = useMemo(
    () => ({
      page: 1,
      limit: 20,
      search: search.trim() || undefined,
      specialtySlug: selectedSpecialty,
    }),
    [search, selectedSpecialty],
  );
  const practitionersQuery = usePractitioners(filters);

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(248,249,251,0.82)",
            borderRadius: 999,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
          }}
        >
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <AppText color={colors.primary}>←</AppText>
            <AppText variant="title" style={{ fontWeight: "900" }} color={colors.primary}>
              Fayed
            </AppText>
          </View>
          <View
            style={{
              backgroundColor: "rgba(213,227,255,0.65)",
              borderRadius: 999,
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText>🙂</AppText>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading" style={{ fontWeight: "900" }}>
            {t("practitionersTitle")}
          </AppText>
          <AppText color={colors.textSecondary}>{t("practitionersSubtitle")}</AppText>
        </View>

        <View
          style={{
            backgroundColor: "rgba(230,232,234,0.75)",
            borderRadius: 999,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
          }}
        >
          <AppInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchPlaceholder")}
            style={{ backgroundColor: "transparent", minHeight: 56, paddingHorizontal: spacing.md }}
          />
        </View>

        {specialtiesQuery.isLoading ? <AppLoader label={t("loading")} /> : null}
        {specialtiesQuery.isError ? <AppErrorState onRetry={() => specialtiesQuery.refetch()} /> : null}

        {specialtiesQuery.isSuccess ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
            <Pressable
              onPress={() => setSelectedSpecialty(undefined)}
              style={{
                backgroundColor: !selectedSpecialty ? colors.primary : "rgba(242,244,246,0.95)",
                borderRadius: 999,
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: spacing.lg,
              }}
            >
              <AppText color={!selectedSpecialty ? "#FFFFFF" : colors.textSecondary} style={{ fontWeight: "700" }}>
                الكل
              </AppText>
            </Pressable>

            {specialtiesQuery.data.map((specialty) => {
              const isSelected = selectedSpecialty === specialty.slug;
              return (
                <Pressable
                  key={specialty.id}
                  onPress={() => setSelectedSpecialty(specialty.slug)}
                  style={{
                    backgroundColor: isSelected ? "rgba(197,236,204,0.9)" : "rgba(242,244,246,0.95)",
                    borderRadius: 999,
                    minHeight: 48,
                    justifyContent: "center",
                    paddingHorizontal: spacing.lg,
                  }}
                >
                  <AppText color={isSelected ? "#00210E" : colors.textSecondary} style={{ fontWeight: "700" }}>
                    {specialty.name || specialty.slug}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {practitionersQuery.isLoading ? <AppLoader label={t("loading")} /> : null}
        {practitionersQuery.isError ? <AppErrorState onRetry={() => practitionersQuery.refetch()} /> : null}

        {practitionersQuery.isSuccess && practitionersQuery.data.items.length === 0 ? (
          <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : null}

        {practitionersQuery.isSuccess
          ? practitionersQuery.data.items.map((practitioner) => (
              <PractitionerListCard key={practitioner.id} practitioner={practitioner} />
            ))
          : null}
      </View>
    </AppScreen>
  );
}
