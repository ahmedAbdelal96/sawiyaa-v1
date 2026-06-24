import { apiClient, extractApiData } from "../../../lib/api";
import { listSpecialties, listSpecialtyCategories } from "../../specialties/api";
import type {
  PractitionerCredentialsResponse,
  PractitionerSpecialtiesResponse,
  SpecialtyCatalog,
  SubmitPractitionerApplicationRequest,
  SubmitPractitionerApplicationResponse,
  UpdatePractitionerSpecialtiesRequest,
  UpdatePractitionerSpecialtiesResponse,
  UploadPractitionerCredentialRequest,
  UploadPractitionerCredentialResponse,
} from "./types";

export async function getSpecialtyCatalog(): Promise<SpecialtyCatalog> {
  const [categoryResponse, specialtyResponse] = await Promise.all([
    listSpecialtyCategories(),
    listSpecialties(),
  ]);

  return {
    categories: categoryResponse.categories,
    specialties: specialtyResponse.specialties,
  };
}

export async function getPractitionerSpecialties() {
  const response = await apiClient.get("/practitioners/me/specialties");
  return extractApiData<PractitionerSpecialtiesResponse>(response);
}

export async function updatePractitionerSpecialties(
  payload: UpdatePractitionerSpecialtiesRequest,
) {
  const response = await apiClient.put("/practitioners/me/specialties", payload);
  return extractApiData<UpdatePractitionerSpecialtiesResponse>(response);
}

export async function getPractitionerCredentials() {
  const response = await apiClient.get("/practitioners/me/credentials");
  return extractApiData<PractitionerCredentialsResponse>(response);
}

export async function uploadPractitionerCredential(
  payload: UploadPractitionerCredentialRequest,
) {
  const response = await apiClient.post("/practitioners/me/credentials", payload);
  return extractApiData<UploadPractitionerCredentialResponse>(response);
}

export async function submitPractitionerApplication(
  payload: SubmitPractitionerApplicationRequest,
) {
  const response = await apiClient.post("/practitioners/me/application/submit", payload);
  return extractApiData<SubmitPractitionerApplicationResponse>(response);
}
