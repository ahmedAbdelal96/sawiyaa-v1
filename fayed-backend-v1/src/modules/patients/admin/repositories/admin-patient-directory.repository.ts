import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus, UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  AdminPatientOnboardingDto,
  AdminPatientStatusDto,
} from '../dto/list-admin-patients.dto';

@Injectable()
export class AdminPatientDirectoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private resolveStatusFilter(
    status?: AdminPatientStatusDto,
  ): UserStatus[] | undefined {
    if (!status) return undefined;

    if (status === AdminPatientStatusDto.ACTIVE) return [UserStatus.ACTIVE];
    if (status === AdminPatientStatusDto.SUSPENDED)
      return [UserStatus.SUSPENDED];
    if (status === AdminPatientStatusDto.INACTIVE) return [UserStatus.INACTIVE];

    return [UserStatus.PENDING_VERIFICATION, UserStatus.PENDING_APPROVAL];
  }

  private buildWhere(input: {
    search?: string;
    status?: AdminPatientStatusDto;
    onboarding?: AdminPatientOnboardingDto;
  }): Prisma.PatientProfileWhereInput {
    const search = input.search?.trim();
    const looksLikeUuid =
      Boolean(search) &&
      typeof search === 'string' &&
      search.length >= 32 &&
      search.length <= 40 &&
      search.includes('-');
    const statuses = this.resolveStatusFilter(input.status);
    const onboardingFilter =
      input.onboarding === AdminPatientOnboardingDto.COMPLETED
        ? { onboardingCompletedAt: { not: null } }
        : input.onboarding === AdminPatientOnboardingDto.INCOMPLETE
          ? { onboardingCompletedAt: null }
          : undefined;

    console.log('[adminPatients] buildWhere', {
      search: search ?? null,
      looksLikeUuid,
      status: input.status ?? null,
      onboarding: input.onboarding ?? null,
    });

    return {
      ...(onboardingFilter ?? {}),
      user: {
        ...(statuses ? { status: { in: statuses } } : {}),
        roles: {
          some: {
            role: UserRoleType.PATIENT,
          },
        },
        OR: search
          ? [
              ...(looksLikeUuid
                ? [
                    {
                      id: {
                        equals: search,
                      },
                    },
                  ]
                : []),
              {
                displayName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                emails: {
                  some: {
                    email: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                phones: {
                  some: {
                    phone: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ]
          : undefined,
      },
      OR: search
        ? [
            {
              displayName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            ...(looksLikeUuid
              ? [
                  {
                    id: {
                      equals: search,
                    },
                  },
                  {
                    userId: {
                      equals: search,
                    },
                  },
                ]
              : []),
          ]
        : undefined,
    };
  }

  async list(input: {
    search?: string;
    status?: AdminPatientStatusDto;
    onboarding?: AdminPatientOnboardingDto;
    skip: number;
    take: number;
  }) {
    const where = this.buildWhere(input);

    const [rows, total, completedOnboarding] = await Promise.all([
      this.prisma.patientProfile.findMany({
        where,
        select: {
          id: true,
          userId: true,
          displayName: true,
          onboardingCompletedAt: true,
          createdAt: true,
          country: {
            select: { isoCode: true },
          },
          user: {
            select: {
              displayName: true,
              status: true,
              emails: {
                where: { isPrimary: true },
                take: 1,
                select: { email: true, isVerified: true },
              },
              phones: {
                where: { isPrimary: true },
                take: 1,
                select: { phone: true, isVerified: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.patientProfile.count({ where }),
      this.prisma.patientProfile.count({
        where: { ...where, onboardingCompletedAt: { not: null } },
      }),
    ]);

    return {
      rows,
      total,
      completedOnboarding,
      incompleteOnboarding: Math.max(0, total - completedOnboarding),
    };
  }

  async findDetails(patientId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        userId: true,
        displayName: true,
        gender: true,
        dateOfBirth: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
        country: { select: { isoCode: true } },
        user: {
          select: {
            displayName: true,
            status: true,
            emails: {
              where: { isPrimary: true },
              take: 1,
              select: { email: true, isVerified: true },
            },
            phones: {
              where: { isPrimary: true },
              take: 1,
              select: { phone: true, isVerified: true },
            },
            roles: { select: { role: true } },
          },
        },
      },
    });
  }
}
