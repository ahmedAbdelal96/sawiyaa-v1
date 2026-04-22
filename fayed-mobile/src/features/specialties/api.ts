import { apiClient, extractApiData } from "../../lib/api";
import type {
  SpecialtiesListResponse,
  SpecialtyCategoriesListResponse,
} from "./contracts";

export async function listSpecialties() {
  const response = await apiClient.get("/specialties");
  return extractApiData<SpecialtiesListResponse>(response);
}

export async function listSpecialtyCategories() {
  const response = await apiClient.get("/specialty-categories");
  return extractApiData<SpecialtyCategoriesListResponse>(response);
}
