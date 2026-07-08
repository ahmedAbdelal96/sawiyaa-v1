import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Specialty-category repository for practitioner taxonomy.
 * The database is expected to be migrated before this repository is used.
 */
@Injectable()
export class SpecialtyCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly categorySelect = {
    id: true,
    name: true,
    nameAr: true,
    nameEn: true,
    slug: true,
    description: true,
    isActive: true,
    sortOrder: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private buildSearchFilter(search?: string) {
    const normalizedSearch = search?.trim();
    if (!normalizedSearch) return undefined;

    return {
      OR: [
        {
          name: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
        {
          nameAr: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
        {
          nameEn: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
        {
          slug: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
        {
          description: {
            contains: normalizedSearch,
            mode: 'insensitive' as const,
          },
        },
      ],
    };
  }

  listActiveCategories() {
    return this.prisma.specialtyCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: this.categorySelect,
    });
  }

  listForAdmin(search?: string) {
    return this.prisma.specialtyCategory.findMany({
      where: this.buildSearchFilter(search),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: this.categorySelect,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.specialtyCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  findById(id: string) {
    return this.prisma.specialtyCategory.findUnique({
      where: { id },
      select: this.categorySelect,
    });
  }

  async getNextSortOrder() {
    const latest = await this.prisma.specialtyCategory.findFirst({
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { sortOrder: true },
    });
    return (latest?.sortOrder ?? -1) + 1;
  }

  create(input: {
    slug: string;
    name: string;
    nameAr?: string | null;
    nameEn?: string | null;
    description?: string | null;
    sortOrder: number;
    isActive: boolean;
  }) {
    return this.prisma.specialtyCategory.create({
      data: {
        slug: input.slug,
        name: input.name,
        nameAr: input.nameAr ?? null,
        nameEn: input.nameEn ?? null,
        description: input.description ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      select: this.categorySelect,
    });
  }

  update(
    id: string,
    input: {
      slug?: string;
      name?: string;
      nameAr?: string | null;
      nameEn?: string | null;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.specialtyCategory.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        description: input.description,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      select: this.categorySelect,
    });
  }

  findActiveById(id: string) {
    return this.prisma.specialtyCategory.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }
}
