import { Platform } from "react-native";
import { apiClient, extractApiData } from "../../../lib/api";
import { getSecureAuthTokens } from "../../auth/secure-token-storage";
import i18n from "../../../i18n";
import type {
  PatientProfileResponse,
  UpdatePatientProfilePayload,
} from "./types";

export async function getPatientProfile() {
  const response = await apiClient.get("/patients/me");
  return extractApiData<PatientProfileResponse>(response);
}

export async function patchPatientProfile(payload: UpdatePatientProfilePayload) {
  const response = await apiClient.patch("/patients/me", payload);
  return extractApiData<PatientProfileResponse>(response);
}

export interface PatientAvatarResponse {
  message: string;
  avatar: {
    patientProfileId: string;
    avatarUrl: string;
  };
}

export interface AvatarAsset {
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function inferMimeType(uri: string, fallback: string): string {
  const raw = uri.split("?")[0].toLowerCase();
  if (raw.endsWith(".png")) return "image/png";
  if (raw.endsWith(".webp")) return "image/webp";
  if (raw.endsWith(".jpg") || raw.endsWith(".jpeg")) return "image/jpeg";
  return fallback;
}

function inferFileName(uri: string): string {
  const raw = uri.split("?")[0].toLowerCase();
  if (raw.endsWith(".png")) return "avatar.png";
  if (raw.endsWith(".webp")) return "avatar.webp";
  if (raw.endsWith(".jpg") || raw.endsWith(".jpeg")) return "avatar.jpg";
  return "avatar.jpg";
}

export function validateAvatarAsset(asset: AvatarAsset): {
  valid: true;
  fileName: string;
  mimeType: string;
} | { valid: false; error: string } {
  const mimeType = asset.mimeType
    ? asset.mimeType.toLowerCase()
    : inferMimeType(asset.uri, "");

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: "unsupportedType" };
  }

  if (asset.fileSize != null && asset.fileSize > MAX_BYTES) {
    return { valid: false, error: "imageTooLarge" };
  }

  return {
    valid: true,
    fileName: asset.fileName ?? inferFileName(asset.uri),
    mimeType,
  };
}

export async function buildAvatarFormData(
  asset: AvatarAsset,
): Promise<FormData> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const blob = await fetch(asset.uri).then((r) => r.blob());

    const mimeType = (asset.mimeType
      ? asset.mimeType.toLowerCase()
      : blob.type || inferMimeType(asset.uri, "image/jpeg"));

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error("unsupportedType");
    }

    if (blob.size > MAX_BYTES) {
      throw new Error("imageTooLarge");
    }

    const fileName = asset.fileName ?? inferFileName(asset.uri);
    formData.append("file", blob, fileName);
  } else {
    const validated = validateAvatarAsset(asset);
    if (!validated.valid) {
      throw new Error(validated.error);
    }
    formData.append("file", {
      uri: asset.uri,
      name: validated.fileName,
      type: validated.mimeType,
    } as unknown as Blob);
  }

  return formData;
}

function resolveAvatarBaseUrl(): string {
  const configured = (
    process.env as Record<string, string | undefined>
  ).EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured;
  if (Platform.OS === "android") return "http://10.0.2.2:7000/api/v1";
  return "http://localhost:7000/api/v1";
}

export async function uploadPatientAvatar(
  asset: AvatarAsset,
): Promise<PatientAvatarResponse> {
  const formData = await buildAvatarFormData(asset);

  if (Platform.OS === "web") {
    const tokens = await getSecureAuthTokens();
    const accessToken = tokens?.accessToken ?? "";
    const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
    const url = `${resolveAvatarBaseUrl()}/patients/me/avatar`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-lang": lang,
      },
      body: formData,
    });

    if (!response.ok) {
      let message = `Upload failed: ${response.status}`;
      try {
        const json = await response.json();
        message = (json?.data?.message || json?.message || message) as string;
      } catch {}
      throw new Error(message);
    }

    const json = await response.json();
    return json.data as PatientAvatarResponse;
  }

  // Native path — axios handles FormData correctly on iOS/Android
  const response = await apiClient.post("/patients/me/avatar", formData);
  return extractApiData<PatientAvatarResponse>(response);
}

export async function removePatientAvatar(): Promise<PatientAvatarResponse> {
  const response = await apiClient.delete("/patients/me/avatar");
  return extractApiData<PatientAvatarResponse>(response);
}
