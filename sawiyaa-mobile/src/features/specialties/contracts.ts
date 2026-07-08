export interface SpecialtyCategory {
  id: string;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Specialty {
  id: string;
  name: string | null;
  nameAr: string | null;
  nameEn: string | null;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  category: SpecialtyCategory | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialtiesListResponse {
  message: string;
  specialties: Specialty[];
}

export interface SpecialtyCategoriesListResponse {
  message: string;
  categories: SpecialtyCategory[];
}
