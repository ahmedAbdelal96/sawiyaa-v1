import {
  ConversationParticipantRole,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import {
  buildGeneralChatParticipantIdentity,
  resolveGeneralChatProfessionalTitles,
  type GeneralChatParticipantDirectoryRecord,
} from './general-chat-identity.mapper';

function practitionerRecord(
  overrides: Partial<
    NonNullable<GeneralChatParticipantDirectoryRecord['practitionerProfile']>
  > = {},
): GeneralChatParticipantDirectoryRecord {
  return {
    id: 'user-practitioner',
    displayName: 'Canonical Practitioner Name',
    status: UserStatus.ACTIVE,
    patientProfile: null,
    practitionerProfile: {
      avatarUrl: null,
      professionalTitle: 'Legacy Clinical Psychologist',
      primaryContentLocale: null,
      professionalContentTranslations: [],
      status: PractitionerStatus.APPROVED,
      isPublicProfilePublished: true,
      primarySpecialtyCategory: { name: 'Psychology' },
      ...overrides,
    },
  };
}

function participant() {
  return {
    userId: 'user-practitioner',
    participantRole: ConversationParticipantRole.PRACTITIONER,
  };
}

describe('General Chat participant professional-title presentation', () => {
  it('localizes only subtitle while preserving canonical identity fields and response shape', () => {
    const resolver = new PractitionerProfessionalContentResolver();
    const record = practitionerRecord({
      primaryContentLocale: 'en',
      professionalContentTranslations: [
        {
          locale: 'ar',
          professionalTitle:
            '\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a',
          bio: null,
        },
        { locale: 'en', professionalTitle: 'Clinical Psychologist', bio: null },
      ],
    });
    const directory = new Map([[record.id, record]]);

    const arTitles = resolveGeneralChatProfessionalTitles(
      [record],
      'ar',
      resolver,
    );
    const enTitles = resolveGeneralChatProfessionalTitles(
      [record],
      'en',
      resolver,
    );
    const ar = buildGeneralChatParticipantIdentity(
      participant(),
      directory,
      arTitles,
    );
    const en = buildGeneralChatParticipantIdentity(
      participant(),
      directory,
      enTitles,
    );

    expect(ar).toEqual({
      participantId: 'user-practitioner',
      userId: 'user-practitioner',
      displayName: 'Canonical Practitioner Name',
      avatarUrl: null,
      role: ConversationParticipantRole.PRACTITIONER,
      subtitle: '\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a',
      status: PractitionerStatus.APPROVED,
      verificationStatus: 'PUBLISHED',
    });
    expect(en?.subtitle).toBe('Clinical Psychologist');

    const withoutSubtitle = (value: typeof ar) => {
      if (!value) return value;
      const { subtitle, ...identity } = value;
      void subtitle;
      return identity;
    };
    expect(withoutSubtitle(ar)).toEqual(withoutSubtitle(en));
  });

  it('preserves the legacy title when approved translation rows are absent', () => {
    const resolver = new PractitionerProfessionalContentResolver();
    const record = practitionerRecord();
    const titles = resolveGeneralChatProfessionalTitles(
      [record],
      'ar',
      resolver,
    );

    expect(
      buildGeneralChatParticipantIdentity(
        participant(),
        new Map([[record.id, record]]),
        titles,
      )?.subtitle,
    ).toBe('Legacy Clinical Psychologist');
  });

  it('preserves the specialty fallback when no title exists', () => {
    const resolver = new PractitionerProfessionalContentResolver();
    const record = practitionerRecord({
      professionalTitle: null,
      primarySpecialtyCategory: { name: 'Psychology' },
    });
    const titles = resolveGeneralChatProfessionalTitles(
      [record],
      'en',
      resolver,
    );

    expect(
      buildGeneralChatParticipantIdentity(
        participant(),
        new Map([[record.id, record]]),
        titles,
      )?.subtitle,
    ).toBe('Psychology');
  });

  it('resolves live directory content in one batch and has no pending-review input', () => {
    const resolver = new PractitionerProfessionalContentResolver();
    const spy = jest.spyOn(resolver, 'resolve');
    const record = practitionerRecord({
      professionalTitle: 'Clinical Psychologist',
      professionalContentTranslations: [
        { locale: 'en', professionalTitle: 'Clinical Psychologist', bio: null },
      ],
    });

    const titles = resolveGeneralChatProfessionalTitles(
      [record],
      'en',
      resolver,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(titles.get(record.id)).toBe('Clinical Psychologist');
    expect(record).not.toHaveProperty('pendingProfileProposal');
    expect(record).not.toHaveProperty('applicationDraft');
  });
});
