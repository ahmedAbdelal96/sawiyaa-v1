import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  ErrorState,
  Header,
  Input,
  LoadingState,
  Screen,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
import {
  listSpecialties,
  listSpecialtyCategories,
} from "../../src/features/specialties/api";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "../../src/features/specialties/localized";
import type {
  Specialty,
  SpecialtyCategory,
} from "../../src/features/specialties/contracts";

// Dynamic Icon assignment helper based on category slug or index
function getCategoryIcon(slug: string, index: number): keyof typeof Ionicons.glyphMap {
  if (slug.includes("anxiety") || slug.includes("stress")) return "sparkles-outline";
  if (slug.includes("depression") || slug.includes("mood")) return "heart-outline";
  if (slug.includes("relationship") || slug.includes("family")) return "people-outline";
  if (slug.includes("psychiatry") || slug.includes("assessment")) return "medkit-outline";
  if (slug.includes("child") || slug.includes("adolescent")) return "happy-outline";
  if (slug.includes("addiction")) return "shield-outline";
  if (slug.includes("trauma") || slug.includes("ptsd")) return "bandage-outline";

  const fallbackIcons: (keyof typeof Ionicons.glyphMap)[] = [
    "sparkles-outline",
    "heart-outline",
    "people-outline",
    "medkit-outline",
    "happy-outline",
    "fitness-outline",
    "bulb-outline",
    "shield-outline",
  ];
  return fallbackIcons[index % fallbackIcons.length];
}

// Grouped category structure with sub-specialties
interface CategoryGroup {
  category: SpecialtyCategory;
  subSpecialties: Specialty[];
}

export default function PublicSpecialtiesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language || "ar";
  const isArabic = locale.startsWith("ar");
  const { textAlign, isRtl, rowDirection, chevronForward } = useAppDirection();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});

  // Fetch Categories & Specialties
  const categoriesQuery = useQuery({
    queryKey: ["public-specialty-categories"],
    queryFn: listSpecialtyCategories,
  });

  const specialtiesQuery = useQuery({
    queryKey: ["public-specialties"],
    queryFn: listSpecialties,
  });

  const isLoading = categoriesQuery.isLoading || specialtiesQuery.isLoading;
  const isError = categoriesQuery.isError || specialtiesQuery.isError;

  const rawCategories = categoriesQuery.data?.categories ?? [];
  const rawSpecialties = specialtiesQuery.data?.specialties ?? [];

  // Group sub-specialties into main category groups
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const groupsMap = new Map<string, CategoryGroup>();

    // Initialize all main categories
    for (const cat of rawCategories) {
      if (cat.isActive !== false) {
        groupsMap.set(cat.id, { category: cat, subSpecialties: [] });
      }
    }

    // Unassigned sub-specialties bucket
    const unassigned: Specialty[] = [];

    for (const spec of rawSpecialties) {
      if (spec.isActive === false) continue;

      if (spec.category?.id && groupsMap.has(spec.category.id)) {
        groupsMap.get(spec.category.id)!.subSpecialties.push(spec);
      } else {
        unassigned.push(spec);
      }
    }

    const result = Array.from(groupsMap.values());

    // Sort categories by sortOrder or subSpecialties count
    result.sort((a, b) => (a.category.sortOrder ?? 0) - (b.category.sortOrder ?? 0));

    // Add general category if there are unassigned specialties
    if (unassigned.length > 0) {
      result.push({
        category: {
          id: "general",
          name: isArabic ? "تخصصات إضافية" : "Additional Specialties",
          nameAr: "تخصصات إضافية",
          nameEn: "Additional Specialties",
          slug: "general",
          description: null,
          isActive: true,
          sortOrder: 999,
        },
        subSpecialties: unassigned,
      });
    }

    return result;
  }, [rawCategories, rawSpecialties, isArabic]);

  // Filter groups & sub-specialties based on search query
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryGroups;

    return categoryGroups
      .map((group) => {
        const catName = getLocalizedSpecialtyCategoryName(group.category, locale).toLowerCase();
        const matchesCategory = catName.includes(query);

        const matchingSubs = group.subSpecialties.filter((sub) => {
          const subName = getLocalizedSpecialtyName(sub, locale).toLowerCase();
          return subName.includes(query);
        });

        if (matchesCategory || matchingSubs.length > 0) {
          return {
            category: group.category,
            // If category matches, show all subs; otherwise show only matching subs
            subSpecialties: matchesCategory ? group.subSpecialties : matchingSubs,
          };
        }
        return null;
      })
      .filter((g): g is CategoryGroup => g !== null);
  }, [categoryGroups, searchQuery, locale]);

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategoryIds((prev) => ({
      ...prev,
      [catId]: !(prev[catId] ?? true), // Default open
    }));
  };

  const handleSelectSpecialty = (sub: Specialty) => {
    const slug = sub.slug || sub.id;
    router.push({
      pathname: "/(public)/discovery",
      params: {
        specialtySlug: slug,
        search: getLocalizedSpecialtyName(sub, locale),
      },
    } as any);
  };

  const handleSelectCategory = (category: SpecialtyCategory) => {
    const slug = category.slug || category.id;
    router.push({
      pathname: "/(public)/discovery",
      params: {
        specialtySlug: slug,
        search: getLocalizedSpecialtyCategoryName(category, locale),
      },
    } as any);
  };

  const handleRetry = () => {
    void categoriesQuery.refetch();
    void specialtiesQuery.refetch();
  };

  return (
    <Screen bg="background">
      <Header
        showBack
        title={isArabic ? "التخصصات العلاجية" : "Therapeutic Specialties"}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro Box */}
        <View style={[styles.introBox, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text
            variant="h2"
            weight="bold"
            style={[styles.title, { textAlign }]}
          >
            {isArabic ? "اختر المسار العلاجي الأقرب لك" : "Choose Your Care Path"}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={[styles.subtitle, { textAlign }]}
          >
            {isArabic
              ? "تصفح التخصصات الرئيسية والفرعية، وابحث عن المجال الأنسب لاحتياجك."
              : "Browse main and sub-specialties, and search for the domain tailored to your needs."}
          </Text>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchWrap}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={
              isArabic
                ? "ابحث عن تخصص رئيسي أو فرعي..."
                : "Search main or sub-specialty..."
            }
            leftElement={
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.colors.textMuted}
              />
            }
            rightElement={
              searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              ) : undefined
            }
            containerStyle={styles.searchInputContainer}
          />
        </View>

        {/* Content States */}
        {isLoading ? (
          <View style={styles.stateWrapper}>
            <LoadingState />
          </View>
        ) : isError ? (
          <View style={styles.stateWrapper}>
            <ErrorState onRetry={handleRetry} />
          </View>
        ) : filteredGroups.length === 0 ? (
          <View style={[styles.emptyWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
            <Ionicons name="search" size={32} color={theme.colors.textMuted} />
            <Text weight="bold" style={styles.emptyTitle} color={theme.colors.textPrimary}>
              {isArabic ? "لم نجد أي تخصص يطابق بحثك" : "No Specialties Found"}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.emptyNote}>
              {isArabic
                ? `لم تعثر على نتائج مطابقة لـ "${searchQuery}". جرب البحث بكلمات أخرى.`
                : `No results matching "${searchQuery}". Try searching with different keywords.`}
            </Text>
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={[styles.clearSearchBtn, { backgroundColor: theme.colors.primaryLight }]}
            >
              <Text weight="bold" color={theme.colors.primary} style={styles.clearSearchBtnText}>
                {isArabic ? "مسح البحث" : "Clear Search"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.groupsList}>
            {filteredGroups.map((group, index) => {
              const catId = group.category.id;
              const catName = getLocalizedSpecialtyCategoryName(group.category, locale);
              const iconName = getCategoryIcon(group.category.slug, index);
              const isExpanded = searchQuery.length > 0 || (expandedCategoryIds[catId] ?? true);
              const subCount = group.subSpecialties.length;

              return (
                <View
                  key={catId}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  {/* Category Card Header */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => toggleCategoryExpand(catId)}
                    style={[styles.categoryHeader, { flexDirection: rowDirection }]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                      <Ionicons name={iconName} size={22} color={theme.colors.primary} />
                    </View>

                    <View style={[styles.categoryTitleWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
                      <View style={[styles.titleBadgeRow, { flexDirection: rowDirection }]}>
                        <Text weight="bold" style={styles.categoryTitle} color={theme.colors.textPrimary}>
                          {catName}
                        </Text>
                        {subCount > 0 ? (
                          <View style={[styles.subCountBadge, { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight }]}>
                            <Text style={styles.subCountText} color={theme.colors.primary} weight="600">
                              {isArabic ? `${subCount} تخصصات فرعية` : `${subCount} Sub-specialties`}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {group.category.description ? (
                        <Text color={theme.colors.textMuted} style={styles.categoryDesc} numberOfLines={1}>
                          {group.category.description}
                        </Text>
                      ) : null}
                    </View>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Sub-Specialties List / Chips (Expanded) */}
                  {isExpanded && subCount > 0 ? (
                    <View style={styles.subListContainer}>
                      <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

                      <Text color={theme.colors.textMuted} weight="600" style={styles.subSectionHeading}>
                        {isArabic ? "التخصصات الفرعية المجالية:" : "Domain Sub-Specialties:"}
                      </Text>

                      <View style={styles.subGrid}>
                        {group.subSpecialties.map((sub) => {
                          const subName = getLocalizedSpecialtyName(sub, locale);

                          return (
                            <TouchableOpacity
                              key={sub.id}
                              activeOpacity={0.85}
                              onPress={() => handleSelectSpecialty(sub)}
                              style={[
                                styles.subChip,
                                {
                                  backgroundColor: theme.colors.surfaceTertiary,
                                  borderColor: theme.colors.borderLight,
                                  flexDirection: rowDirection,
                                },
                              ]}
                            >
                              <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
                              <Text
                                weight="600"
                                color={theme.colors.textPrimary}
                                style={styles.subChipText}
                              >
                                {subName}
                              </Text>
                              <Ionicons name={chevronForward} size={14} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {/* Explore Category Action Button */}
                  {isExpanded ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleSelectCategory(group.category)}
                      style={[styles.exploreCategoryBtn, { borderTopColor: theme.colors.borderLight }]}
                    >
                      <Text weight="bold" color={theme.colors.primary} style={styles.exploreCategoryText}>
                        {isArabic ? `عرض كافة المختصين في ${catName}` : `View all specialists in ${catName}`}
                      </Text>
                      <Ionicons name={chevronForward} size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
    gap: 14,
  },

  // Intro
  introBox: { gap: 4, paddingHorizontal: 2 },
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 13, lineHeight: 19 },

  // Search
  searchWrap: { marginBottom: 2 },
  searchInputContainer: { marginBottom: 0 },

  // States
  stateWrapper: { paddingVertical: 40 },
  emptyWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 16, lineHeight: 22 },
  emptyNote: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  clearSearchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 6,
  },
  clearSearchBtnText: { fontSize: 13 },

  // Main Categories & Sub-Specialties
  groupsList: { gap: 14 },
  categoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  categoryHeader: {
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitleWrap: {
    flex: 1,
    gap: 2,
  },
  titleBadgeRow: {
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  subCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  subCountText: { fontSize: 11 },
  categoryDesc: { fontSize: 12, lineHeight: 17 },

  // Sub-specialties Section
  subListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  divider: { height: 1, marginBottom: 4 },
  subSectionHeading: { fontSize: 12 },
  subGrid: { gap: 8 },
  subChip: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  subChipText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Explore Action
  exploreCategoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  exploreCategoryText: { fontSize: 13 },
});
