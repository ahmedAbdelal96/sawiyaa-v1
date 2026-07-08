import type {
  PractitionerApplicationStatusResponse,
  PractitionerSpecialty,
} from "../profile/types";

export type PractitionerCredentialType =
  | "LICENSE"
  | "DEGREE"
  | "CERTIFICATION"
  | "NATIONAL_ID"
  | "PASSPORT"
  | "MEMBERSHIP"
  | "OTHER";

export type PractitionerCredentialReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

export interface PractitionerCredential {
  credentialId: string;
  credentialType: PractitionerCredentialType;
  fileUrl: string;
  reviewStatus: PractitionerCredentialReviewStatus | string;
  expiresAt: string | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface PractitionerCredentialsResponse {
  message: string;
  credentials: PractitionerCredential[];
}

export interface PractitionerSpecialtiesResponse {
  message: string;
  specialties: PractitionerSpecialty[];
}

export interface UpdatePractitionerSpecialtiesRequest {
  primarySpecialtyCategoryId: string;
  specialtyIds: string[];
}

export interface UpdatePractitionerSpecialtiesResponse {
  message: string;
  specialties: PractitionerSpecialty[];
}

export interface UploadPractitionerCredentialRequest {
  credentialType: PractitionerCredentialType;
  fileUrl: string;
  expiresAt?: string | null;
}

export interface UploadPractitionerCredentialResponse {
  message: string;
  credential: PractitionerCredential;
}

export interface SpecialtyCatalog {
  categories: Array<{
    id: string;
    name: string;
    nameAr: string | null;
    nameEn: string | null;
    slug: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
  }>;
  specialties: Array<{
    id: string;
    name: string | null;
    nameAr: string | null;
    nameEn: string | null;
    slug: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
    category: {
      id: string;
      name: string;
      nameAr: string | null;
      nameEn: string | null;
      slug: string;
      description: string | null;
      isActive: boolean;
      sortOrder: number;
    } | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface SubmitPractitionerApplicationRequest {
  displayName?: string;
  professionalTitle?: string | null;
  bio?: string | null;
  countryCode?: string | null;
  yearsOfExperience?: number | null;
  practitionerType?:
    | "PSYCHOLOGIST"
    | "PSYCHIATRIST"
    | "NUTRITIONIST"
    | "WEIGHT_LOSS_SPECIALIST"
    | "COUNSELOR"
    | "OTHER";
  practitionerGender?: "MALE" | "FEMALE" | null;
  sessionPrice30Egp?: number | null;
  sessionPrice30Usd?: number | null;
  sessionPrice60Egp?: number | null;
  sessionPrice60Usd?: number | null;
  locale?: "ar" | "en";
  timezone?: string;
  languageCodes?: string[];
  specialtySelection?: UpdatePractitionerSpecialtiesRequest;
}

export interface SubmitPractitionerApplicationResponse {
  message: string;
  application: PractitionerApplicationStatusResponse;
}
