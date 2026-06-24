import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CorporateContractRepository } from '../repositories/corporate-contract.repository';
import { CorporateOrganizationRepository } from '../repositories/corporate-organization.repository';
import { CorporatePresenter, ContractViewModel } from '../presenters/corporate.presenter';
import { CorporateContractStatus, CorporateMarket } from '@prisma/client';

interface ListContractsInput {
  organizationId: string;
  page: number;
  limit: number;
  status?: CorporateContractStatus;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ListContractsResult {
  items: ContractViewModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListContractsUseCase {
  constructor(
    private readonly contractRepository: CorporateContractRepository,
    private readonly organizationRepository: CorporateOrganizationRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: ListContractsInput): Promise<ListContractsResult> {
    const {
      organizationId,
      page,
      limit,
      status,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = input;

    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const { items, total } = await this.contractRepository.listByOrganization({
      organizationId,
      status,
      page,
      limit,
      sortBy,
      sortDirection,
    });

    return {
      items: items.map((contract) => this.presenter.toContractViewModel(contract)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

@Injectable()
export class GetContractUseCase {
  constructor(
    private readonly contractRepository: CorporateContractRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(id: string) {
    const contract = await this.contractRepository.findById(id);

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    return this.presenter.toContractViewModel(contract);
  }
}

interface CreateContractInput {
  organizationId: string;
  startDate: string;
  endDate: string;
  billingMode: string;
  currency: string;
  market: string;
  status?: CorporateContractStatus;
  notes?: Record<string, unknown>;
}

@Injectable()
export class CreateContractUseCase {
  constructor(
    private readonly contractRepository: CorporateContractRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: CreateContractInput) {
    const { startDate, endDate, billingMode, currency, market } = input;

    if (new Date(endDate) <= new Date(startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException('Currency must be 3 uppercase letters (e.g., EGP, USD)');
    }

    if (market === CorporateMarket.EGYPT && currency !== 'EGP') {
      throw new BadRequestException('EGYPT market requires EGP currency');
    }
    if (market === CorporateMarket.INTERNATIONAL && currency !== 'USD') {
      throw new BadRequestException('INTERNATIONAL market requires USD currency');
    }

    if (billingMode !== 'PREPAID') {
      throw new BadRequestException(
        'V1 only supports PREPAID billing mode. POSTPAID and HYBRID are not yet available.',
      );
    }

    const contract = await this.contractRepository.create({
      organizationId: input.organizationId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      billingMode,
      currency,
      market,
      status: input.status,
      notes: input.notes,
    });

    return this.presenter.toContractViewModel(contract);
  }
}

interface UpdateContractInput {
  id: string;
  startDate?: string;
  endDate?: string;
  billingMode?: string;
  currency?: string;
  market?: string;
  notes?: Record<string, unknown>;
}

@Injectable()
export class UpdateContractUseCase {
  constructor(
    private readonly contractRepository: CorporateContractRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: UpdateContractInput) {
    const existing = await this.contractRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Contract with ID ${input.id} not found`);
    }

    if (existing.status === CorporateContractStatus.ACTIVE) {
      const criticalFields = ['startDate', 'currency', 'market'];
      for (const field of criticalFields) {
        if (input[field as keyof UpdateContractInput] !== undefined) {
          throw new BadRequestException(
            `Cannot change '${field}' on an active contract`,
          );
        }
      }
    }

    if (input.endDate && input.startDate && new Date(input.endDate) <= new Date(input.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    if (input.currency && !/^[A-Z]{3}$/.test(input.currency)) {
      throw new BadRequestException('Currency must be 3 uppercase letters');
    }

    const updateData = {
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      billingMode: input.billingMode,
      currency: input.currency,
      market: input.market,
      notes: input.notes,
    };

    const updated = await this.contractRepository.update(input.id, updateData);
    return this.presenter.toContractViewModel(updated);
  }
}

interface UpdateContractStatusInput {
  id: string;
  status: CorporateContractStatus;
}

@Injectable()
export class UpdateContractStatusUseCase {
  constructor(
    private readonly contractRepository: CorporateContractRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: UpdateContractStatusInput) {
    const existing = await this.contractRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Contract with ID ${input.id} not found`);
    }

    const validTransitions: Record<CorporateContractStatus, CorporateContractStatus[]> = {
      DRAFT: [CorporateContractStatus.ACTIVE],
      ACTIVE: [CorporateContractStatus.EXPIRED, CorporateContractStatus.TERMINATED],
      EXPIRED: [],
      TERMINATED: [],
    };

    if (!validTransitions[existing.status].includes(input.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${existing.status} to ${input.status}`,
      );
    }

    if (input.status === CorporateContractStatus.EXPIRED && existing.status === CorporateContractStatus.ACTIVE) {
      const now = new Date();
      if (now < existing.endDate) {
        throw new BadRequestException(
          'Contract cannot be expired while endDate is in the future. Use TERMINATED instead.',
        );
      }
    }

    const updated = await this.contractRepository.updateStatus(input.id, input.status);
    return this.presenter.toContractViewModel(updated);
  }
}