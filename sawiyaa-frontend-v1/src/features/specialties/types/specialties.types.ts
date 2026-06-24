/**
 * Specialties catalog contracts for public and admin specialty endpoints.
 */

export interface SpecialtyCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Specialty {
  id: string;
  name: string | null;
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

export interface SpecialtySuccessResponse {
  message: string;
  specialty: Specialty;
}

export interface SpecialtyCategoriesListResponse {
  message: string;
  categories: SpecialtyCategory[];
}

export interface SpecialtyCategorySuccessResponse {
  message: string;
  category: SpecialtyCategory;
}

export interface ListSpecialtiesParams {
  q?: string;
}

export interface CreateSpecialtyCategoryRequest {
  title: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateSpecialtyCategoryRequest {
  title?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateSpecialtyRequest {
  categoryId: string;
  slug: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateSpecialtyRequest {
  categoryId?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ToggleSpecialtyStatusRequest {
  isActive: boolean;
}
