import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CountryRepository } from '../../repositories/country.repository';
import { PatientProfileRepository } from '../../repositories/patient-profile.repository';
import { PatientUserRepository } from '../../repositories/patient-user.repository';
import { AdminPatientCountryChangeDto } from '../dto/admin-patient-country-change.dto';

export interface AdminPatientCountryChangeResult {
  patientId: string;
  patientProfileId: string;
  country: {
    id: string;
    isoCode: string;
    name: string;
  } | null;
  updatedAt: Date;
}

@Injectable()
export class AdminPatientCountryChangeUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly patientUserRepository: PatientUserRepository,
    private readonly countryRepository: CountryRepository,
    private readonly securityAuditService: SecurityAuditService,
    private readonly i18nService: I18nService,
  ) {}

  async execute(input: {
    actorId: string;
    actorRoles: string[];
    patientId: string;
    locale: SupportedLocale;
    data: AdminPatientCountryChangeDto;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AdminPatientCountryChangeResult> {
    const { actorId, actorRoles, patientId, locale, data, ipAddress, userAgent } = input;

    // Validate target patient exists and has a profile
    const existingUser = await this.patientUserRepository.findById(patientId);
    if (!existingUser) {
      throw new NotFoundException({
        messageKey: 'patients.errors.patientNotFound',
        error: 'PATIENT_NOT_FOUND',
      });
    }

    const existingProfile = await this.patientProfileRepository.findByUserId(patientId);
    if (!existingProfile) {
      throw new NotFoundException({
        messageKey: 'patients.errors.patientProfileNotFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    // Resolve target country
    const normalizedCountryCode = data.countryCode.trim().toUpperCase();
    const country = await this.countryRepository.findByIsoCodeWithName(normalizedCountryCode);
    if (!country) {
      throw new BadRequestException({
        messageKey: 'patients.errors.countryNotFound',
        error: 'COUNTRY_NOT_FOUND',
      });
    }

    // Detect no-op: same country
    const currentCountryId = existingProfile.countryId;
    const currentCountryIsoCode = existingProfile.country?.isoCode ?? null;
    if (currentCountryId === country.id) {
      throw new BadRequestException({
        messageKey: 'patients.errors.countryChangeNoOp',
        error: 'COUNTRY_CHANGE_NO_OP',
        message: `Patient is already in ${country.isoCode}. No change needed.`,
      });
    }

    // Update patient profile country
    const updatedProfile = await this.patientProfileRepository.updateCountry(
      patientId,
      country.id,
    );

    // Log audit entry with full change detail
    this.securityAuditService.logAsync({
      action: 'privacy.patient.country.changed',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: actorId,
      actorRoles,
      resourceType: 'PatientProfile',
      resourceId: updatedProfile.id,
      targetUserId: patientId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      reason: data.reason,
      metadata: {
        oldCountryId: currentCountryId ?? null,
        oldCountryCode: currentCountryIsoCode,
        newCountryId: country.id,
        newCountryCode: country.isoCode,
        reason: data.reason,
      },
    });

    return {
      patientId,
      patientProfileId: updatedProfile.id,
      country: {
        id: country.id,
        isoCode: country.isoCode,
        name: country.name,
      },
      updatedAt: updatedProfile.updatedAt,
    };
  }
}