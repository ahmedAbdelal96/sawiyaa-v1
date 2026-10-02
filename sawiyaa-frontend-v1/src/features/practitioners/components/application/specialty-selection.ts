export type SpecialtyHierarchyItem = {
  id: string;
  category?: { id: string } | null;
};

export function filterSpecialtiesByPrimaryCategory<T extends SpecialtyHierarchyItem>(
  specialties: T[],
  primaryCategoryId: string,
): T[] {
  if (!primaryCategoryId) return [];
  return specialties.filter((specialty) => specialty.category?.id === primaryCategoryId);
}

export function retainValidSpecialtyIds(
  selectedIds: string[],
  specialties: SpecialtyHierarchyItem[],
  primaryCategoryId: string,
): string[] {
  const validIds = new Set(
    filterSpecialtiesByPrimaryCategory(specialties, primaryCategoryId).map(
      (specialty) => specialty.id,
    ),
  );
  return selectedIds.filter((id) => validIds.has(id));
}
