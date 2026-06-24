import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CorporateOrganizationRepository } from '../repositories/corporate-organization.repository';
import { CorporatePresenter, OrganizationViewModel } from '../presenters/corporate.presenter';
import { CorporateOrganizationStatus } from '@prisma/client';

interface ListOrganizationsInput {
  page: number;
  limit: number;
  search?: string;
  status?: CorporateOrganizationStatus;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ListOrganizationsResult {
  items: OrganizationViewModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: ListOrganizationsInput): Promise<ListOrganizationsResult> {
    const {
      page,
      limit,
      search,
      status,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = input;

    const { items, total } = await this.organizationRepository.list({
      search,
      status,
      page,
      limit,
      sortBy,
      sortDirection,
    });

    return {
      items: items.map((org) => this.presenter.toOrganizationViewModel(org)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

@Injectable()
export class GetOrganizationUseCase {
  constructor(
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(id: string) {
    const org = await this.organizationRepository.findById(id);

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return this.presenter.toOrganizationViewModel(org);
  }
}

interface CreateOrganizationInput {
  name: string;
  companyCode: string;
  countryIsoCode?: string;
  billingEmail: string;
  contactName?: string;
  contactPhone?: string;
  status?: CorporateOrganizationStatus;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: CreateOrganizationInput) {
    const normalizedCode = input.companyCode.toUpperCase();

    const existing = await this.organizationRepository.findByCompanyCode(normalizedCode);
    if (existing) {
      throw new BadRequestException(
        `Organization with company code '${normalizedCode}' already exists`,
      );
    }

    const org = await this.organizationRepository.create({
      name: input.name,
      companyCode: normalizedCode,
      countryIsoCode: input.countryIsoCode,
      billingEmail: input.billingEmail,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      status: input.status,
    });

    return this.presenter.toOrganizationViewModel(org);
  }
}

interface UpdateOrganizationInput {
  id: string;
  name?: string;
  companyCode?: string;
  countryIsoCode?: string;
  billingEmail?: string;
  contactName?: string;
  contactPhone?: string;
}

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: UpdateOrganizationInput) {
    const { id, ...data } = input;

    const existing = await this.organizationRepository.findByIdWithActiveContracts(id);
    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (data.companyCode) {
      const normalizedCode = data.companyCode.toUpperCase();
      const codeOwner = await this.organizationRepository.findByCompanyCode(normalizedCode);
      if (codeOwner && codeOwner.id !== id) {
        throw new BadRequestException(
          `Company code '${normalizedCode}' is already used by another organization`,
        );
      }
      if (existing._count.contracts > 0 || existing._count.batches > 0) {
        throw new BadRequestException(
          'Cannot change company code when organization has active contracts or batches',
        );
      }
    }

    const updated = await this.organizationRepository.update(id, data);
    return this.presenter.toOrganizationViewModel(updated);
  }
}

interface UpdateOrganizationStatusInput {
  id: string;
  status: CorporateOrganizationStatus;
}

@Injectable()
export class UpdateOrganizationStatusUseCase {
  constructor(
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: UpdateOrganizationStatusInput) {
    const existing = await this.organizationRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Organization with ID ${input.id} not found`);
    }

    const updated = await this.organizationRepository.updateStatus(input.id, input.status);
    return this.presenter.toOrganizationViewModel(updated);
  }
}