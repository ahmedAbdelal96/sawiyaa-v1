import type {
  PractitionerListItem,
  PractitionerProfile,
  Specialty,
} from "@/modules/practitioners/domain/practitioners.types";

export function mapSpecialty(input: Specialty): Specialty {
  return input;
}

export function mapPractitionerListItem(input: PractitionerListItem): PractitionerListItem {
  return input;
}

export function mapPractitionerProfile(input: PractitionerProfile): PractitionerProfile {
  return input;
}
