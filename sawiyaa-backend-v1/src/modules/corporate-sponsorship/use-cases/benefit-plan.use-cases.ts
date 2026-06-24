import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CorporateBenefitPlanRepository } from '../repositories/corporate-benefit-plan.repository';
import { CorporateContractRepository } from '../repositories/corporate-contract.repository';
import { CorporatePresenter, BenefitPlanViewModel } from '../presenters/corporate.presenter';
import { CorporateBenefitPlanStatus, CorporateCoverageType } from '@prisma/client';
import { Prisma } from '@prisma/client';

interface ListBenefitPlansInput {
  contractId: string;
  page: number;
  limit: number;
  status?: CorporateBenefitPlanStatus;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ListBenefitPlansResult {
  items: BenefitPlanViewModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListBenefitPlansUseCase {
  constructor(
    private readonly planRepository: CorporateBenefitPlanRepository,
    private readonly contractRepository: CorporateContractRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: ListBenefitPlansInput): Promise<ListBenefitPlansResult> {
    const {
      contractId,
      page,
      limit,
      status,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = input;

    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    const { items, total } = await this.planRepository.listByContract({
      contractId,
      status,
      page,
      limit,
      sortBy,
      sortDirection,
    });

    return {
      items: items.map((plan) => this.presenter.toBenefitPlanViewModel(plan)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

@Injectable()
export class GetBenefitPlanUseCase {
  constructor(
    private readonly planRepository: CorporateBenefitPlanRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(id: string) {
    const plan = await this.planRepository.findById(id);

    if (!plan) {
      throw new NotFoundException(`Benefit plan with ID ${id} not found`);
    }

    return this.presenter.toBenefitPlanViewModel(plan);
  }
}

interface CreateBenefitPlanInput {
  contractId: string;
  name: string;
  coverageType: CorporateCoverageType;
  coveragePercent?: number;
  maxCoverageAmount?: number;
  maxTotalCoverage?: number;
  currency: string;
  codeUsageLimit?: number;
  codeReservationTtlMinutes?: number;
  status?: CorporateBenefitPlanStatus;
  specialtyIds?: string[];
  practitionerIds?: string[];
}

@Injectable()
export class CreateBenefitPlanUseCase {
  constructor(
    private readonly planRepository: CorporateBenefitPlanRepository,
    private readonly contractRepository: CorporateContractRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: CreateBenefitPlanInput) {
    if (input.codeUsageLimit !== undefined && input.codeUsageLimit !== 1) {
      throw new BadRequestException('V1 code usage limit must be 1');
    }

    if (input.codeReservationTtlMinutes !== undefined) {
      if (input.codeReservationTtlMinutes < 5 || input.codeReservationTtlMinutes > 60) {
        throw new BadRequestException('Code reservation TTL must be between 5 and 60 minutes');
      }
    }

    switch (input.coverageType) {
      case CorporateCoverageType.FREE_SESSION:
        if (input.coveragePercent !== undefined && input.coveragePercent !== 100) {
          throw new BadRequestException('FREE_SESSION coverage percent must be 100 or null');
        }
        break;
      case CorporateCoverageType.DISCOUNT_PERCENT:
        if (input.coveragePercent === undefined || input.coveragePercent < 1 || input.coveragePercent > 100) {
          throw new BadRequestException('DISCOUNT_PERCENT requires coveragePercent between 1 and 100');
        }
        break;
      case CorporateCoverageType.FIXED_AMOUNT:
        if (!input.maxCoverageAmount || input.maxCoverageAmount <= 0) {
          throw new BadRequestException('FIXED_AMOUNT requires maxCoverageAmount > 0');
        }
        break;
    }

    const contract = await this.contractRepository.findById(input.contractId);
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${input.contractId} not found`);
    }

    if (input.specialtyIds?.length) {
      const valid = await this.planRepository.validateSpecialtyIds(input.specialtyIds);
      if (!valid) {
        throw new BadRequestException('One or more specialty IDs are invalid');
      }
    }

    if (input.practitionerIds?.length) {
      const valid = await this.planRepository.validatePractitionerIds(input.practitionerIds);
      if (!valid) {
        throw new BadRequestException('One or more practitioner IDs are invalid');
      }
    }

    const planCurrency = input.currency.toUpperCase();
    if (planCurrency !== contract.currency) {
      throw new BadRequestException(
        `Plan currency ${planCurrency} must match contract currency ${contract.currency}`,
      );
    }

    const plan = await this.planRepository.createWithRelations({
      contractId: input.contractId,
      name: input.name,
      coverageType: input.coverageType,
      coveragePercent: input.coveragePercent,
      maxCoverageAmount: input.maxCoverageAmount ? new Prisma.Decimal(input.maxCoverageAmount) : undefined,
      maxTotalCoverage: input.maxTotalCoverage ? new Prisma.Decimal(input.maxTotalCoverage) : undefined,
      currency: planCurrency,
      codeUsageLimit: input.codeUsageLimit ?? 1,
      codeReservationTtlMinutes: input.codeReservationTtlMinutes ?? 15,
      status: input.status,
      specialtyIds: input.specialtyIds,
      practitionerIds: input.practitionerIds,
    });

    const fullPlan = await this.planRepository.findById(plan.id);
    return this.presenter.toBenefitPlanViewModel(fullPlan!);
  }
}

interface UpdateBenefitPlanInput {
  id: string;
  name?: string;
  coverageType?: CorporateCoverageType;
  coveragePercent?: number;
  maxCoverageAmount?: number;
  maxTotalCoverage?: number;
  codeUsageLimit?: number;
  codeReservationTtlMinutes?: number;
  specialtyIds?: string[];
  practitionerIds?: string[];
}

@Injectable()
export class UpdateBenefitPlanUseCase {
  constructor(
    private readonly planRepository: CorporateBenefitPlanRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: UpdateBenefitPlanInput) {
    const existing = await this.planRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Benefit plan with ID ${input.id} not found`);
    }

    if (existing._count?.codes && existing._count.codes > 0) {
      throw new BadRequestException(
        'Cannot modify plan after code generation. Create a new plan version.',
      );
    }

    if (input.codeUsageLimit !== undefined && input.codeUsageLimit !== 1) {
      throw new BadRequestException('V1 code usage limit must be 1');
    }

    if (input.codeReservationTtlMinutes !== undefined) {
      if (input.codeReservationTtlMinutes < 5 || input.codeReservationTtlMinutes > 60) {
        throw new BadRequestException('Code reservation TTL must be between 5 and 60 minutes');
      }
    }

    if (input.specialtyIds !== undefined) {
      const valid = await this.planRepository.validateSpecialtyIds(input.specialtyIds);
      if (!valid) {
        throw new BadRequestException('One or more specialty IDs are invalid');
      }
    }

    if (input.practitionerIds !== undefined) {
      const valid = await this.planRepository.validatePractitionerIds(input.practitionerIds);
      if (!valid) {
        throw new BadRequestException('One or more practitioner IDs are invalid');
      }
    }

    const { specialtyIds, practitionerIds, ...rest } = input;
    const updateData = {
      ...rest,
      maxCoverageAmount: rest.maxCoverageAmount !== undefined
        ? new Prisma.Decimal(rest.maxCoverageAmount) : undefined,
      maxTotalCoverage: rest.maxTotalCoverage !== undefined
        ? new Prisma.Decimal(rest.maxTotalCoverage) : undefined,
    };

    const updated = await this.planRepository.updateWithRelations(input.id, {
      ...updateData,
      specialtyIds,
      practitionerIds,
    });
    return this.presenter.toBenefitPlanViewModel(updated);
  }
}

interface UpdateBenefitPlanStatusInput {
  id: string;
  status: CorporateBenefitPlanStatus;
}

@Injectable()
export class UpdateBenefitPlanStatusUseCase {
  constructor(
    private readonly planRepository: CorporateBenefitPlanRepository,
    private readonly presenter: CorporatePresenter,
  ) {}

  async execute(input: UpdateBenefitPlanStatusInput) {
    const existing = await this.planRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Benefit plan with ID ${input.id} not found`);
    }

    const validStatuses = [CorporateBenefitPlanStatus.ACTIVE, CorporateBenefitPlanStatus.SUSPENDED, CorporateBenefitPlanStatus.EXPIRED];
    if (!validStatuses.includes(input.status)) {
      throw new BadRequestException(`Invalid status: ${input.status}`);
    }

    const updated = await this.planRepository.updateStatus(input.id, input.status);
    return this.presenter.toBenefitPlanViewModel(updated);
  }
}