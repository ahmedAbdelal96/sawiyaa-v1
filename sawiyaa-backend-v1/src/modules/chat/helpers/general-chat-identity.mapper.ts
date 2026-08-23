import {
  ConversationParticipantRole,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { GeneralChatParticipantIdentityDto } from '../dto/general-chat-response.dto';

export type GeneralChatParticipantDirectoryRecord = {
  id: string;
  displayName: string | null;
  status: UserStatus;
  patientProfile: {
    displayName: string | null;
  } | null;
  practitionerProfile: {
    avatarUrl: string | null;
    professionalTitle: string | null;
    primaryContentLocale: SupportedLocale | null;
    professionalContentTranslations: Array<{
      locale: SupportedLocale;
      professionalTitle: string | null;
      bio: string | null;
    }>;
    status: PractitionerStatus;
    isPublicProfilePublished: boolean;
    primarySpecialtyCategory: {
      name: string;
    } | null;
  } | null;
};

export type GeneralChatParticipantRow = {
  userId: string;
  participantRole: ConversationParticipantRole;
};

function normalizeText(value: string | null | undefined) {
  const next = value?.trim();
  return next && next.length > 0 ? next : null;
}

function resolveDisplayName(
  record: GeneralChatParticipantDirectoryRecord,
  role: ConversationParticipantRole,
) {
  if (role === ConversationParticipantRole.PRACTITIONER) {
    return (
      normalizeText(record.displayName) ??
      normalizeText(record.practitionerProfile?.professionalTitle) ??
      'Practitioner'
    );
  }

  return (
    normalizeText(record.displayName) ??
    normalizeText(record.patientProfile?.displayName) ??
    'Patient'
  );
}

function resolveSubtitle(
  record: GeneralChatParticipantDirectoryRecord,
  role: ConversationParticipantRole,
  resolvedProfessionalTitles?: ReadonlyMap<string, string | null>,
) {
  if (role === ConversationParticipantRole.PRACTITIONER) {
    return (
      resolvedProfessionalTitles?.get(record.id) ??
      normalizeText(record.practitionerProfile?.professionalTitle) ??
      normalizeText(
        record.practitionerProfile?.primarySpecialtyCategory?.name,
      ) ??
      null
    );
  }

  return null;
}

function resolveStatus(
  record: GeneralChatParticipantDirectoryRecord,
  role: ConversationParticipantRole,
) {
  if (role === ConversationParticipantRole.PRACTITIONER) {
    return record.practitionerProfile?.status ?? null;
  }

  return record.status ?? null;
}

function resolveVerificationStatus(
  record: GeneralChatParticipantDirectoryRecord,
  role: ConversationParticipantRole,
) {
  if (role !== ConversationParticipantRole.PRACTITIONER) {
    return null;
  }

  return record.practitionerProfile?.isPublicProfilePublished
    ? 'PUBLISHED'
    : 'UNPUBLISHED';
}

export function buildGeneralChatParticipantIdentity(
  participant: GeneralChatParticipantRow,
  directory: Map<string, GeneralChatParticipantDirectoryRecord>,
  resolvedProfessionalTitles?: ReadonlyMap<string, string | null>,
): GeneralChatParticipantIdentityDto | null {
  const record = directory.get(participant.userId);
  if (!record) {
    return null;
  }

  return {
    participantId: record.id,
    userId: record.id,
    displayName: resolveDisplayName(record, participant.participantRole),
    avatarUrl:
      participant.participantRole === ConversationParticipantRole.PRACTITIONER
        ? (record.practitionerProfile?.avatarUrl ?? null)
        : null,
    role: participant.participantRole,
    subtitle: resolveSubtitle(
      record,
      participant.participantRole,
      resolvedProfessionalTitles,
    ),
    status: resolveStatus(record, participant.participantRole),
    verificationStatus: resolveVerificationStatus(
      record,
      participant.participantRole,
    ),
  };
}

export function buildGeneralChatParticipantSummary(
  participant: GeneralChatParticipantRow,
  directory: Map<string, GeneralChatParticipantDirectoryRecord>,
  resolvedProfessionalTitles?: ReadonlyMap<string, string | null>,
) {
  return {
    userId: participant.userId,
    role: participant.participantRole,
    identity: buildGeneralChatParticipantIdentity(
      participant,
      directory,
      resolvedProfessionalTitles,
    ),
  };
}

export function resolveGeneralChatProfessionalTitles(
  records: GeneralChatParticipantDirectoryRecord[],
  requestedLocale: SupportedLocale,
  professionalContentResolver: PractitionerProfessionalContentResolver,
) {
  return new Map(
    records.map((record) => {
      const profile = record.practitionerProfile;
      if (!profile) {
        return [record.id, null] as const;
      }

      const resolved = professionalContentResolver.resolve({
        requestedLocale,
        primaryContentLocale: profile.primaryContentLocale,
        translations: profile.professionalContentTranslations,
        legacyProfessionalTitle: profile.professionalTitle,
      });

      return [record.id, resolved.professionalTitle] as const;
    }),
  );
}

export function buildGeneralChatParticipantDirectoryMap(
  records: GeneralChatParticipantDirectoryRecord[],
) {
  return new Map(records.map((record) => [record.id, record]));
}

export function resolveGeneralChatMessageSenderIdentity(
  senderUserId: string | null,
  participants: GeneralChatParticipantRow[],
  directory: Map<string, GeneralChatParticipantDirectoryRecord>,
) {
  if (!senderUserId) {
    return null;
  }

  const participant = participants.find(
    (entry) => entry.userId === senderUserId,
  );
  if (!participant) {
    return null;
  }

  return buildGeneralChatParticipantIdentity(participant, directory);
}
