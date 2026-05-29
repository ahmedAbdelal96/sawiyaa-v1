import { Injectable } from '@nestjs/common';
import {
  CorporateOrganization,
  CorporateContract,
  CorporateBenefitPlan,
} from '@prisma/client';

export interface OrganizationViewModel {
  id: string;
  name: string;
  companyCode: string;
  countryIsoCode: string | null;
  status: string;
  billingEmail: string;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  contractCount?: number;
  activeContractCount?: number;
}

export interface ContractViewModel {
  id: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  billingMode: string;
  currency: string;
  market: string;
  notes: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  planCount?: number;
}

export interface BenefitPlanViewModel {
  id: string;
  contractId: string;
  name: string;
  coverageType: string;
  coveragePercent: number | null;
  maxCoverageAmount: string | null;
  maxTotalCoverage: string | null;
  currency: string;
  codeUsageLimit: number;
  codeReservationTtlMinutes: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  specialtyCount?: number;
  practitionerCount?: number;
}

@Injectable()
export class CorporatePresenter {
  toOrganizationViewModel(
    org: CorporateOrganization & {
      _count?: { contracts?: number; batches?: number; codes?: number };
    },
  ): OrganizationViewModel {
    return {
      id: org.id,
      name: org.name,
      companyCode: org.companyCode,
      countryIsoCode: org.countryIsoCode,
      status: org.status,
      billingEmail: org.billingEmail,
      contactName: org.contactName,
      contactPhone: org.contactPhone,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      contractCount: org._count?.contracts,
      activeContractCount: org._count?.contracts,
    };
  }

  toContractViewModel(
    contract: CorporateContract & {
      _count?: { plans?: number; batches?: number; codes?: number };
    },
  ): ContractViewModel {
    return {
      id: contract.id,
      organizationId: contract.organizationId,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      billingMode: contract.billingMode,
      currency: contract.currency,
      market: contract.market,
      notes: contract.notes as Record<string, unknown> | null,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      planCount: contract._count?.plans,
    };
  }

  toBenefitPlanViewModel(
    plan: CorporateBenefitPlan & {
      _count?: { codes?: number; sponsorships?: number };
      specialties?: Array<{ specialty: { id: string } }>;
      practitioners?: Array<{ practitioner: { id: string } }>;
    },
  ): BenefitPlanViewModel {
    return {
      id: plan.id,
      contractId: plan.contractId,
      name: plan.name,
      coverageType: plan.coverageType,
      coveragePercent: plan.coveragePercent,
      maxCoverageAmount: plan.maxCoverageAmount?.toString() ?? null,
      maxTotalCoverage: plan.maxTotalCoverage?.toString() ?? null,
      currency: plan.currency,
      codeUsageLimit: plan.codeUsageLimit,
      codeReservationTtlMinutes: plan.codeReservationTtlMinutes,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      specialtyCount: plan.specialties?.length ?? 0,
      practitionerCount: plan.practitioners?.length ?? 0,
    };
  }
}
