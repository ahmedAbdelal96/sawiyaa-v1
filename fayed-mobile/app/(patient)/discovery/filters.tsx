import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Header, Screen, Text, Button } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { LoadingState, ErrorState } from "../../../src/components/ui";
import { listSpecialties } from "../../../src/features/specialties/api";

type ParamsShape = Record<string, string | string[]>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function toParamsRecord(params: ParamsShape): Record<string, string> {
  const output: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    const normalized = firstParam(value);
    if (normalized !== undefined) {
      output[key] = normalized;
    }
  });
  return output;
}

export default function DiscoveryFiltersScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<ParamsShape>();

  const baseParams = useMemo(() => toParamsRecord(params), [params]);
  const specialtiesQuery = useQuery({
    queryKey: ["public-specialties", "discovery-filters"],
    queryFn: listSpecialties,
  });

  const [specialtySlug, setSpecialtySlug] = useState(
    baseParams.specialtySlug || "",
  );
  const [language, setLanguage] = useState(baseParams.language || "");
  const [gender, setGender] = useState(baseParams.gender || "");
  const [onlineNow, setOnlineNow] = useState(baseParams.onlineNow || "");
  const [availableToday, setAvailableToday] = useState(
    baseParams.availableToday || "",
  );
  const [availableThisWeek, setAvailableThisWeek] = useState(
    baseParams.availableThisWeek || "",
  );
  const [acceptsCoupon, setAcceptsCoupon] = useState(
    baseParams.acceptsCoupon || "",
  );
  const [acceptsPackage, setAcceptsPackage] = useState(
    baseParams.acceptsPackage || "",
  );
  const [sort, setSort] = useState(baseParams.sort || "");
  const [minRating, setMinRating] = useState(baseParams.minRating || "");
  const [minSessionFee, setMinSessionFee] = useState(
    baseParams.minSessionFee || "",
  );
  const [maxSessionFee, setMaxSessionFee] = useState(
    baseParams.maxSessionFee || "",
  );

  const boolChoices = [
    { id: "true", labelKey: "discovery.filters.booleanYes" },
    { id: "false", labelKey: "discovery.filters.booleanNo" },
  ];

  const specialtyChoices = useMemo(() => {
    return (specialtiesQuery.data?.specialties ?? [])
      .filter((item) => item.isActive)
      .slice()
      .sort((a, b) => {
        const categoryA = a.category?.name ?? "";
        const categoryB = b.category?.name ?? "";
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB);
        }
        return (a.name ?? a.slug).localeCompare(b.name ?? b.slug);
      })
      .map((item) => ({
        id: item.slug,
        label: item.name ?? item.slug,
      }));
  }, [specialtiesQuery.data?.specialties]);

  const languageChoices = useMemo(
    () => [
      { id: "", label: t("discovery.filters.any") },
      { id: "ar", label: t("matching.question.language.ar") },
      { id: "en", label: t("matching.question.language.en") },
      { id: "fr", label: t("matching.question.language.fr") },
    ],
    [t],
  );

  const sortChoices = [
    { id: "", labelKey: "discovery.filters.sortNone" },
    { id: "recommended", labelKey: "discovery.filters.sortRecommended" },
    { id: "rating", labelKey: "discovery.filters.sortRatingDesc" },
    { id: "experience", labelKey: "discovery.filters.sortExperienceDesc" },
  ];

  const applyFilters = () => {
    router.replace({
      pathname: "/(patient)/discovery",
      params: {
        ...baseParams,
        page: "1",
        specialtySlug: specialtySlug || undefined,
        language: language || undefined,
        gender: gender || undefined,
        onlineNow: onlineNow || undefined,
        availableToday: availableToday || undefined,
        availableThisWeek: availableThisWeek || undefined,
        acceptsCoupon: acceptsCoupon || undefined,
        acceptsPackage: acceptsPackage || undefined,
        sort: sort || undefined,
        minRating: minRating || undefined,
        minSessionFee: minSessionFee || undefined,
        maxSessionFee: maxSessionFee || undefined,
      },
    });
  };

  const clearFilters = () => {
    setSpecialtySlug("");
    setLanguage("");
    setGender("");
    setOnlineNow("");
    setAvailableToday("");
    setAvailableThisWeek("");
    setAcceptsCoupon("");
    setAcceptsPackage("");
    setSort("");
    setMinRating("");
    setMinSessionFee("");
    setMaxSessionFee("");
    router.replace({
      pathname: "/(patient)/discovery",
      params: {
        search: baseParams.search,
        limit: baseParams.limit,
        page: "1",
      },
    });
  };

  return (
    <Screen bg="background">
      <Header
        title={t("discovery.filters.header")}
        showBack
      />

      <ScrollView contentContainerStyle={styles.content}>
        <FilterSection title={t("discovery.filters.specialty")}>
          {specialtiesQuery.isLoading ? (
            <LoadingState message={t("discovery.list.loading")} />
          ) : specialtiesQuery.isError ? (
            <ErrorState
              title={t("discovery.filters.specialtyLoadError")}
              message={t("discovery.filters.specialtyLoadErrorSubtitle")}
              onRetry={() => specialtiesQuery.refetch()}
              retryText={t("retry", "Retry")}
            />
          ) : (
            <ChoiceRow
              value={specialtySlug}
              onChange={setSpecialtySlug}
              choices={[
                { id: "", label: t("discovery.filters.any") },
                ...specialtyChoices,
              ]}
            />
          )}
        </FilterSection>

        <FilterSection title={t("discovery.filters.language")}>
          <ChoiceRow
            value={language}
            onChange={setLanguage}
            choices={languageChoices}
          />
        </FilterSection>

        <FilterSection title={t("discovery.filters.gender")}>
          <ChoiceRow
            value={gender}
            onChange={setGender}
            choices={[
              { id: "", label: t("discovery.filters.any") },
              { id: "female", label: t("discovery.filters.female") },
              { id: "male", label: t("discovery.filters.male") },
            ]}
          />
        </FilterSection>

        <FilterSection title={t("discovery.filters.availability")}>
          <ToggleLine
            label={t("discovery.filters.onlineNow")}
            value={onlineNow}
            onChange={setOnlineNow}
            choices={boolChoices.map((item) => ({
              id: item.id,
              label: t(item.labelKey),
            }))}
          />
          <ToggleLine
            label={t("discovery.filters.availableToday")}
            value={availableToday}
            onChange={setAvailableToday}
            choices={boolChoices.map((item) => ({
              id: item.id,
              label: t(item.labelKey),
            }))}
          />
          <ToggleLine
            label={t("discovery.filters.availableThisWeek")}
            value={availableThisWeek}
            onChange={setAvailableThisWeek}
            choices={boolChoices.map((item) => ({
              id: item.id,
              label: t(item.labelKey),
            }))}
          />
        </FilterSection>

        <FilterSection title={t("discovery.filters.billing")}>
          <ToggleLine
            label={t("discovery.filters.acceptsCoupon")}
            value={acceptsCoupon}
            onChange={setAcceptsCoupon}
            choices={boolChoices.map((item) => ({
              id: item.id,
              label: t(item.labelKey),
            }))}
          />
          <ToggleLine
            label={t("discovery.filters.acceptsPackage")}
            value={acceptsPackage}
            onChange={setAcceptsPackage}
            choices={boolChoices.map((item) => ({
              id: item.id,
              label: t(item.labelKey),
            }))}
          />
        </FilterSection>

        <FilterSection title={t("discovery.filters.ratingAndPrice")}>
          <FieldLabel label={t("discovery.filters.minRating")} />
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
            keyboardType="numeric"
            value={minRating}
            onChangeText={setMinRating}
            placeholder={t("discovery.filters.minRatingPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
          />

          <FieldLabel label={t("discovery.filters.minPrice")} />
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
            keyboardType="numeric"
            value={minSessionFee}
            onChangeText={setMinSessionFee}
            placeholder={t("discovery.filters.minPricePlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
          />

          <FieldLabel label={t("discovery.filters.maxPrice")} />
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderLight,
                backgroundColor: theme.colors.surface,
              },
            ]}
            keyboardType="numeric"
            value={maxSessionFee}
            onChangeText={setMaxSessionFee}
            placeholder={t("discovery.filters.maxPricePlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
          />
        </FilterSection>

        <FilterSection title={t("discovery.filters.sorting")}>
          <ChoiceRow
            value={sort}
            onChange={setSort}
            choices={sortChoices.map((item) => ({
              id: item.id,
              label: t(item.labelKey),
            }))}
          />
        </FilterSection>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t("discovery.filters.apply")}
          onPress={applyFilters}
          style={styles.primaryButton}
        />
        <TouchableOpacity onPress={clearFilters} activeOpacity={0.8}>
          <Text
            color={theme.colors.textBrand}
            weight="600"
            style={styles.clearText}
          >
            {t("discovery.filters.clear")}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text weight="600" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text color="#4b5563" style={styles.fieldLabel}>
      {label}
    </Text>
  );
}

function ChoiceRow({
  value,
  onChange,
  choices,
}: {
  value: string;
  onChange: (value: string) => void;
  choices: Array<{ id: string; label: string }>;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.choiceWrap}>
      {choices.map((choice) => {
        const selected = value === choice.id;
        return (
          <TouchableOpacity
            key={choice.id || "all"}
            activeOpacity={0.8}
            onPress={() => onChange(choice.id)}
            style={[
              styles.choice,
              {
                borderColor: selected
                  ? theme.colors.primary
                  : theme.colors.borderStrong,
                backgroundColor: selected
                  ? theme.colors.primaryLight
                  : theme.colors.surface,
              },
            ]}
          >
            <Text
              color={
                selected ? theme.colors.primary : theme.colors.textSecondary
              }
              weight={selected ? "600" : "normal"}
              style={styles.choiceText}
            >
              {choice.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ToggleLine({
  label,
  value,
  onChange,
  choices,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  choices: Array<{ id: string; label: string }>;
}) {
  return (
    <View style={styles.toggleLine}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <ChoiceRow
        value={value}
        onChange={onChange}
        choices={[{ id: "", label: "-" }, ...choices]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceText: {
    fontSize: 14,
  },
  toggleLine: {
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 15,
    marginBottom: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e3e7ef",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
  },
  clearText: {
    textAlign: "center",
    fontSize: 16,
  },
});

