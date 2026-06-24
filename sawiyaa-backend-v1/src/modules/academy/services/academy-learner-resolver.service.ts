import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateAcademyEnrollmentDto } from '../dto/create-academy-enrollment.dto';
import { AcademyRepository } from '../repositories/academy.repository';
import {
  PaymentCountryResolution,
  PaymentGeoContextService,
} from '@modules/payments/services/payment-geo-context.service';

type LearnerRecord = {
  id: string;
  userId: string | null;
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  countryCode: string | null;
  countryCodeDeclared: string | null;
  countryCodeSource: string | null;
  countryCodeMismatch: boolean;
  sourceLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AcademyLearnerResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academyRepository: AcademyRepository,
    private readonly paymentGeoContextService: PaymentGeoContextService,
  ) {}

  async resolve(input: {
    currentUser: AuthenticatedUser | null;
    payload: CreateAcademyEnrollmentDto;
  }): Promise<{
    learner: LearnerRecord;
    countryResolution: PaymentCountryResolution;
  }> {
    const normalizedPhoneNumber = input.payload.phoneNumber.trim();
    const normalizedFullName = input.payload.fullName.trim();
    const normalizedWhatsappNumber =
      input.payload.whatsappNumber?.trim() || null;
    const normalizedEmail = input.payload.email?.trim() || null;
    const normalizedSourceLabel =
      input.payload.sourceLabel?.trim() || 'public-academy';

    if (!input.currentUser) {
      const existingLearner =
        await this.academyRepository.findLearnerByPhoneNumber(
          normalizedPhoneNumber,
        );
      const countryResolution =
        await this.paymentGeoContextService.resolveCountryResolution({
          phoneNumber: normalizedPhoneNumber,
          existingCountryCode: existingLearner?.countryCode ?? null,
        });

      return {
        learner: await this.resolveGuestLearner({
          fullName: normalizedFullName,
          phoneNumber: normalizedPhoneNumber,
          whatsappNumber: normalizedWhatsappNumber,
          email: normalizedEmail,
          countryResolution,
          sourceLabel: normalizedSourceLabel,
        }),
        countryResolution,
      };
    }

    if (!this.canUseLearnerEnrollment(input.currentUser.roles)) {
      throw new ForbiddenException({
        messageKey: 'academy.errors.learnersRestricted',
        error: 'ACADEMY_LEARNER_ENROLLMENT_RESTRICTED',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.currentUser.id },
      select: {
        id: true,
        displayName: true,
        emails: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 1,
          select: {
            email: true,
          },
        },
        phones: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 1,
          select: {
            phone: true,
          },
        },
        patientProfile: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException({
        messageKey: 'academy.errors.learnersRestricted',
        error: 'ACADEMY_LEARNER_ENROLLMENT_RESTRICTED',
      });
    }

    const resolvedFullName =
      this.normalizeText(user.displayName) ??
      this.normalizeText(user.patientProfile?.displayName) ??
      normalizedFullName;
    const resolvedPhoneNumber =
      this.normalizeText(user.phones[0]?.phone) ?? normalizedPhoneNumber;
    const resolvedEmail =
      this.normalizeText(user.emails[0]?.email) ?? normalizedEmail;
    const existingLearner = await this.findPreferredExistingLearner({
      userId: user.id,
      phoneNumber: resolvedPhoneNumber,
      email: resolvedEmail,
    });
    const countryResolution =
      await this.paymentGeoContextService.resolveCountryResolution({
        phoneNumber: resolvedPhoneNumber,
        existingCountryCode: existingLearner?.countryCode ?? null,
      });

    const resolvedLearnerInput = {
      userId: user.id,
      fullName: resolvedFullName,
      phoneNumber: resolvedPhoneNumber,
      whatsappNumber:
        normalizedWhatsappNumber ?? resolvedPhoneNumber ?? normalizedPhoneNumber,
      email: resolvedEmail,
      countryCode: countryResolution.resolvedCountryCode,
      countryCodeDeclared: null,
      countryCodeSource: countryResolution.countrySource,
      countryCodeMismatch: countryResolution.countryMismatch,
      sourceLabel: normalizedSourceLabel,
    };

    const learner = await this.upsertAuthenticatedLearnerSafely({
      existingLearner,
      input: resolvedLearnerInput,
    });

    return {
      learner,
      countryResolution,
    };
  }

  private async resolveGuestLearner(input: {
    fullName: string;
    phoneNumber: string;
    whatsappNumber: string | null;
    email: string | null;
    countryResolution: PaymentCountryResolution;
    sourceLabel: string | null;
  }): Promise<LearnerRecord> {
    return this.academyRepository.upsertLearner({
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      whatsappNumber: input.whatsappNumber,
      email: input.email,
      countryCode: input.countryResolution.resolvedCountryCode,
      countryCodeDeclared: null,
      countryCodeSource: input.countryResolution.countrySource,
      countryCodeMismatch: input.countryResolution.countryMismatch,
      sourceLabel: input.sourceLabel,
    }) as Promise<LearnerRecord>;
  }

  private async findPreferredExistingLearner(input: {
    userId: string;
    phoneNumber: string;
    email: string | null;
  }) {
    const byUserId = await this.prisma.academyLearner.findUnique({
      where: { userId: input.userId },
    });

    if (byUserId) {
      return byUserId;
    }

    const byPhoneNumber = await this.academyRepository.findLearnerByPhoneNumber(
      input.phoneNumber,
    );
    if (byPhoneNumber) {
      return byPhoneNumber;
    }

    if (!input.email) {
      return null;
    }

    return this.prisma.academyLearner.findFirst({
      where: {
        email: input.email,
      },
    });
  }

  private async upsertAuthenticatedLearnerSafely(input: {
    existingLearner: LearnerRecord | null;
    input: {
      userId: string;
      fullName: string;
      phoneNumber: string;
      whatsappNumber: string | null;
      email: string | null;
      countryCode: string | null;
      countryCodeDeclared: string | null;
      countryCodeSource: string | null;
      countryCodeMismatch: boolean;
      sourceLabel: string | null;
    };
  }): Promise<LearnerRecord> {
    try {
      if (input.existingLearner) {
        return (await this.prisma.academyLearner.update({
          where: { id: input.existingLearner.id },
          data: {
            userId: input.input.userId,
            fullName: input.input.fullName,
            phoneNumber: input.input.phoneNumber,
            whatsappNumber: input.input.whatsappNumber,
            email: input.input.email,
            countryCode: input.input.countryCode,
            countryCodeDeclared: input.input.countryCodeDeclared,
            countryCodeSource: input.input.countryCodeSource,
            countryCodeMismatch: input.input.countryCodeMismatch,
            sourceLabel: input.input.sourceLabel,
          },
        })) as LearnerRecord;
      }

      return (await this.prisma.academyLearner.create({
        data: input.input,
      })) as LearnerRecord;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const byUserId = await this.prisma.academyLearner.findUnique({
          where: { userId: input.input.userId },
        });
        if (byUserId) {
          return byUserId as LearnerRecord;
        }

        if (input.existingLearner) {
          throw new ConflictException({
            messageKey: 'academy.errors.learnerContactAlreadyExists',
            error: 'ACADEMY_LEARNER_CONTACT_ALREADY_EXISTS',
          });
        }

        const byPhoneNumber = await this.academyRepository.findLearnerByPhoneNumber(
          input.input.phoneNumber,
        );
        if (byPhoneNumber) {
          return (await this.prisma.academyLearner.update({
            where: { id: byPhoneNumber.id },
            data: {
              userId: input.input.userId,
              fullName: input.input.fullName,
              phoneNumber: input.input.phoneNumber,
              whatsappNumber: input.input.whatsappNumber,
              email: input.input.email,
              countryCode: input.input.countryCode,
              countryCodeDeclared: input.input.countryCodeDeclared,
              countryCodeSource: input.input.countryCodeSource,
              countryCodeMismatch: input.input.countryCodeMismatch,
              sourceLabel: input.input.sourceLabel,
            },
          })) as LearnerRecord;
        }

        throw new ConflictException({
          messageKey: 'academy.errors.learnerContactAlreadyExists',
          error: 'ACADEMY_LEARNER_CONTACT_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }

  private normalizeText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private canUseLearnerEnrollment(roles: AppRole[]): boolean {
    return roles.includes(AppRole.PATIENT) || roles.includes(AppRole.PRACTITIONER);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (error as { code?: string } | null | undefined)?.code === 'P2002';
  }
}
