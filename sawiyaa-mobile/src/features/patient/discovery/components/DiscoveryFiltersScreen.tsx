import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, ErrorState, Header, LoadingState, Screen, Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { listSpecialties, listSpecialtyCategories } from "../../../specialties/api";
import { getLocalizedSpecialtyCategoryName, getLocalizedSpecialtyName } from "../../../specialties/localized";
import { getLocalizedLanguageOptions, normalizeSupportedLanguageCodes } from "../../../languages/reference-data";
import { getSpecialtiesForCategory } from "../view-model";

type DiscoveryRoutePrefix = "/(patient)" | "/(public)";
type ParamsShape = Record<string, string | string[]>;

function flattenParams(params: ParamsShape): Record<string, string> {
  return Object.entries(params).reduce<Record<string, string>>((output, [key, value]) => {
    output[key] = Array.isArray(value) ? value[0] : value;
    return output;
  }, {});
}

export function DiscoveryFiltersScreen({ routePrefix }: { routePrefix: DiscoveryRoutePrefix }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<ParamsShape>();
  const baseParams = useMemo(() => flattenParams(params), [params]);
  const categoriesQuery = useQuery({ queryKey: ["public-specialty-categories", "discovery", i18n.language], queryFn: listSpecialtyCategories, staleTime: 5 * 60 * 1000 });
  const specialtiesQuery = useQuery({ queryKey: ["public-specialties", "discovery", i18n.language], queryFn: listSpecialties, staleTime: 5 * 60 * 1000 });
  const [categorySlug, setCategorySlug] = useState(baseParams.specialtyCategorySlug || "");
  const [specialtySlug, setSpecialtySlug] = useState(baseParams.specialtySlug || "");
  const [languageCodes, setLanguageCodes] = useState(() => normalizeSupportedLanguageCodes([...(baseParams.languageCodes || "").split(","), ...(baseParams.language ? [baseParams.language] : [])]));
  const [gender, setGender] = useState(baseParams.gender || "");
  const [onlineNow, setOnlineNow] = useState(baseParams.onlineNow || "");
  const [availableToday, setAvailableToday] = useState(baseParams.availableToday || "");
  const [availableThisWeek, setAvailableThisWeek] = useState(baseParams.availableThisWeek || "");
  const [duration, setDuration] = useState(baseParams.duration || "");
  const [sort, setSort] = useState(baseParams.sort || "");

  const categories = useMemo(
    () => (categoriesQuery.data?.categories ?? []).filter((item) => item.isActive !== false).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categoriesQuery.data?.categories],
  );
  const specialties = useMemo(
    () => getSpecialtiesForCategory(specialtiesQuery.data?.specialties ?? [], categories.find((item) => item.slug === categorySlug)?.id),
    [categories, categorySlug, specialtiesQuery.data?.specialties],
  );
  const languageChoices = useMemo(() => getLocalizedLanguageOptions(t), [t]);

  const applyFilters = () => {
    router.replace({
      pathname: `${routePrefix}/discovery` as never,
      params: {
        search: baseParams.search,
        limit: baseParams.limit,
        page: "1",
        specialtyCategorySlug: categorySlug || undefined,
        specialtySlug: specialtySlug || undefined,
        languageCodes: languageCodes.length > 0 ? languageCodes.join(",") : undefined,
        language: languageCodes.length === 1 ? languageCodes[0] : undefined,
        gender: gender || undefined,
        onlineNow: onlineNow || undefined,
        availableToday: availableToday || undefined,
        availableThisWeek: availableThisWeek || undefined,
        duration: duration || undefined,
        sort: sort || undefined,
      },
    });
  };

  const clearFilters = () => {
    setCategorySlug("");
    setSpecialtySlug("");
    setLanguageCodes([]);
    setGender("");
    setOnlineNow("");
    setAvailableToday("");
    setAvailableThisWeek("");
    setDuration("");
    setSort("");
    router.replace({ pathname: `${routePrefix}/discovery` as never, params: { search: baseParams.search, limit: baseParams.limit, page: "1" } });
  };

  return (
    <Screen bg="background">
      <Header title={t("discovery.filters.header")} showBack hideMessages />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <FilterSection title={t("discovery.filters.specialty")}>
          {categoriesQuery.isLoading || specialtiesQuery.isLoading ? <LoadingState message={t("discovery.list.loading")} /> : categoriesQuery.isError || specialtiesQuery.isError ? (
            <ErrorState title={t("discovery.filters.specialtyLoadError")} message={t("discovery.filters.specialtyLoadErrorSubtitle")} onRetry={() => { void categoriesQuery.refetch(); void specialtiesQuery.refetch(); }} retryText={t("retry", "Retry")} />
          ) : (
            <>
              <ChoiceRow
                value={categorySlug}
                onChange={(value) => { setCategorySlug(value); setSpecialtySlug(""); }}
                choices={[{ id: "", label: t("discovery.filters.any") }, ...categories.map((category) => ({ id: category.slug, label: getLocalizedSpecialtyCategoryName(category, i18n.language || "en") }))]}
              />
              {specialties.length > 0 ? (
                <View style={styles.subspecialtyBlock}>
                  <Text color={theme.colors.textSecondary} style={styles.subspecialtyLabel}>{t("discovery.filters.subspecialty")}</Text>
                  <ChoiceRow value={specialtySlug} onChange={setSpecialtySlug} choices={[{ id: "", label: t("discovery.filters.any") }, ...specialties.map((specialty) => ({ id: specialty.slug, label: getLocalizedSpecialtyName(specialty, i18n.language || "en") }))]} />
                </View>
              ) : null}
            </>
          )}
        </FilterSection>

        <FilterSection title={t("discovery.filters.language")}>
          <MultiChoiceRow values={languageCodes} onChange={(values) => setLanguageCodes(normalizeSupportedLanguageCodes(values))} choices={languageChoices} anyLabel={t("discovery.filters.any")} />
        </FilterSection>

        <FilterSection title={t("discovery.filters.gender")}>
          <ChoiceRow value={gender} onChange={setGender} choices={[{ id: "", label: t("discovery.filters.any") }, { id: "female", label: t("discovery.filters.female") }, { id: "male", label: t("discovery.filters.male") }]} />
        </FilterSection>

        <FilterSection title={t("discovery.filters.availability")}>
          <ToggleLine label={t("discovery.filters.onlineNow")} value={onlineNow} onChange={setOnlineNow} choices={[{ id: "true", label: t("discovery.filters.booleanYes") }]} />
          <ToggleLine label={t("discovery.filters.availableToday")} value={availableToday} onChange={setAvailableToday} choices={[{ id: "true", label: t("discovery.filters.booleanYes") }]} />
          <ToggleLine label={t("discovery.filters.availableThisWeek")} value={availableThisWeek} onChange={setAvailableThisWeek} choices={[{ id: "true", label: t("discovery.filters.booleanYes") }]} />
        </FilterSection>

        <FilterSection title={t("discovery.filters.duration")}>
          <ChoiceRow value={duration} onChange={setDuration} choices={[{ id: "", label: t("discovery.filters.any") }, { id: "30", label: t("discovery.filters.duration30") }, { id: "60", label: t("discovery.filters.duration60") }]} />
        </FilterSection>

        <FilterSection title={t("discovery.filters.sorting")}>
          <ChoiceRow value={sort} onChange={setSort} choices={[{ id: "", label: t("discovery.filters.sortNone") }, { id: "recommended", label: t("discovery.filters.sortRecommended") }, { id: "rating", label: t("discovery.filters.sortRatingDesc") }, { id: "experience", label: t("discovery.filters.sortExperienceDesc") }]} />
        </FilterSection>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderLight }]}>
        <Button title={t("discovery.filters.apply")} onPress={applyFilters} />
        <TouchableOpacity accessibilityRole="button" onPress={clearFilters} activeOpacity={0.8}>
          <Text color={theme.colors.textBrand} weight="600" style={styles.clearText}>{t("discovery.filters.clear")}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text weight="600" style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function ChoiceRow({ value, onChange, choices }: { value: string; onChange: (value: string) => void; choices: { id: string; label: string }[] }) {
  const { theme } = useTheme();
  return <View style={styles.choiceWrap}>{choices.map((choice) => {
    const selected = value === choice.id;
    return <TouchableOpacity key={choice.id || "any"} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onChange(choice.id)} activeOpacity={0.8} style={[styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.borderStrong, backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface }]}><Text color={selected ? theme.colors.primary : theme.colors.textSecondary} weight={selected ? "600" : "normal"} style={styles.choiceText}>{choice.label}</Text></TouchableOpacity>;
  })}</View>;
}

function MultiChoiceRow({ values, onChange, choices, anyLabel }: { values: string[]; onChange: (values: string[]) => void; choices: { id: string; label: string }[]; anyLabel: string }) {
  const { theme } = useTheme();
  return <View style={styles.choiceWrap}>
    {[{ id: "", label: anyLabel }, ...choices].map((choice) => {
      const selected = choice.id === "" ? values.length === 0 : values.includes(choice.id);
      return <TouchableOpacity key={choice.id || "any"} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => {
        if (choice.id === "") {
          onChange([]);
          return;
        }
        onChange(selected ? values.filter((value) => value !== choice.id) : [...values, choice.id]);
      }} activeOpacity={0.8} style={[styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.borderStrong, backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface }]}>
        <Text color={selected ? theme.colors.primary : theme.colors.textSecondary} weight={selected ? "600" : "normal"} style={styles.choiceText}>{choice.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

function ToggleLine({ label, value, onChange, choices }: { label: string; value: string; onChange: (value: string) => void; choices: { id: string; label: string }[] }) {
  return <View style={styles.toggleLine}><Text style={styles.toggleLabel}>{label}</Text><ChoiceRow value={value} onChange={onChange} choices={[{ id: "", label: "-" }, ...choices]} /></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 150, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16 },
  subspecialtyBlock: { gap: 8, marginTop: 4 },
  subspecialtyLabel: { fontSize: 13 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 40, borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  choiceText: { fontSize: 13 },
  toggleLine: { gap: 8 },
  toggleLabel: { fontSize: 14 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, gap: 8 },
  clearText: { textAlign: "center", paddingVertical: 5 },
});
