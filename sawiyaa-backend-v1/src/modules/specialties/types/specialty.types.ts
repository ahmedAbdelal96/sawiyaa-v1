/**
 * Shared specialties-module response models.
 * These types keep read/admin output contracts stable across controllers and use cases.
 */
export interface SpecialtyCategoryViewModel {
  id: string;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface SpecialtyViewModel {
  id: string;
  name: string | null;
  nameAr: string | null;
  nameEn: string | null;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  category: SpecialtyCategoryViewModel | null;
  createdAt: Date;
  updatedAt: Date;
}
