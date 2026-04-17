import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerSpecialtySelectionInput } from '../types/practitioner.types';

@Injectable()
export class PractitionerSpecialtyIntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  async validateSelection(
    input: PractitionerSpecialtySelectionInput,
  ): Promise<void> {
    const category = await this.prisma.specialtyCategory.findFirst({
      where: {
        id: input.primarySpecialtyCategoryId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.specialtyCategoryNotFound',
        error: 'PRACTITIONER_SPECIALTY_CATEGORY_NOT_FOUND',
      });
    }

    const specialtyCount = await this.prisma.specialty.count({
      where: {
        id: { in: input.specialtyIds },
        isActive: true,
        categoryId: input.primarySpecialtyCategoryId,
      },
    });

    if (specialtyCount !== input.specialtyIds.length) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.invalidSpecialtiesForCategory',
        error: 'PRACTITIONER_INVALID_SPECIALTIES_FOR_CATEGORY',
      });
    }
  }
}
