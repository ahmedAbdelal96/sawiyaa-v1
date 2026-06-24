import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Specialty-category repository for practitioner taxonomy.
 */
@Injectable()
export class SpecialtyCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActiveCategories() {
    return this.prisma.specialtyCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  listForAdmin(search?: string) {
    return this.prisma.specialtyCategory.findMany({
      where: search
        ? {
            OR: [
              {
                name: {
                  contains: search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
      },
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
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
      },
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
    description?: string | null;
    sortOrder: number;
    isActive: boolean;
  }) {
    return this.prisma.specialtyCategory.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  update(
    id: string,
    input: {
      slug?: string;
      name?: string;
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
        description: input.description,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
      },
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
