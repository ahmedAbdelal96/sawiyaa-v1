import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RefundPolicy,
  RefundPolicyAcceptance,
  RefundPolicyClause,
  RefundPolicyType,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { REFUND_POLICY_KEYS } from '../refund-policy.catalog';
import { RefundPolicyRepository } from '../repositories/refund-policy.repository';
import {
  CreateRefundPolicyClauseDto,
  ReorderRefundPolicyClausesDto,
  RefundPolicyClauseDto,
  RefundPolicyDto,
  RefundPoliciesResponseDto,
  UpdateRefundPolicyDto,
} from '../dto/refund-policy.dto';

type DbClient = PrismaService | Prisma.TransactionClient;

export type RefundPolicyAcceptanceRecord = RefundPolicyAcceptance;

export type RefundPolicyListItemViewModel = RefundPolicyDto & {
  clauseCount: number;
};

export type RefundPoliciesListViewModel = RefundPoliciesResponseDto;

type RefundPolicyWithClauses = RefundPolicy & {
  clauses: RefundPolicyClause[];
};

type AcceptanceInput = {
  policyType: RefundPolicyType;
  acceptedRefundPolicyId: string | null | undefined;
  acceptedByUserId: string;
  paymentId: string;
  sessionId?: string | null;
  packagePurchaseId?: string | null;
  displayLocale: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  metadataJson?: Prisma.JsonValue | null;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function hashSnapshot(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function toClauseViewModel(clause: RefundPolicyClause): RefundPolicyClauseDto {
  return {
    id: clause.id,
    titleAr: clause.titleAr,
    titleEn: clause.titleEn,
    bodyAr: clause.bodyAr,
    bodyEn: clause.bodyEn,
    sortOrder: clause.sortOrder,
    isActive: clause.isActive,
    createdAt: clause.createdAt.toISOString(),
    updatedAt: clause.updatedAt.toISOString(),
  };
}

function toPolicyViewModel(policy: RefundPolicyWithClauses): RefundPolicyDto {
  const clauses = [...policy.clauses]
    .filter((clause) => clause.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((clause) => toClauseViewModel(clause));

  return {
    id: policy.id,
    policyType: policy.policyType,
    key: policy.key,
    titleAr: policy.titleAr ?? null,
    titleEn: policy.titleEn ?? null,
    isActive: policy.isActive,
    clauses,
    clauseCount: clauses.length,
    updatedAt: policy.updatedAt.toISOString(),
    createdAt: policy.createdAt.toISOString(),
  };
}

function toPolicyViewModelWithAllClauses(
  policy: RefundPolicyWithClauses,
): RefundPolicyDto {
  const clauses = [...policy.clauses]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((clause) => toClauseViewModel(clause));

  return {
    id: policy.id,
    policyType: policy.policyType,
    key: policy.key,
    titleAr: policy.titleAr ?? null,
    titleEn: policy.titleEn ?? null,
    isActive: policy.isActive,
    clauses,
    clauseCount: clauses.length,
    updatedAt: policy.updatedAt.toISOString(),
    createdAt: policy.createdAt.toISOString(),
  };
}

@Injectable()
export class RefundPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundPolicyRepository: RefundPolicyRepository,
  ) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private async ensurePolicyFamily(
    policyType: RefundPolicyType,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);
    const existing = (await db.refundPolicy.findUnique({
      where: { policyType },
      include: {
        clauses: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })) as RefundPolicyWithClauses | null;

    if (existing) {
      return existing;
    }

    return this.refundPolicyRepository.upsertPolicy(
      {
        policyType,
        key: REFUND_POLICY_KEYS[policyType],
        titleAr: null,
        titleEn: null,
        isActive: true,
      },
      tx,
    );
  }

  async listPolicies(): Promise<RefundPoliciesListViewModel> {
    const policies = await this.refundPolicyRepository.listPolicies();
    return {
      items: policies.map((policy) => toPolicyViewModelWithAllClauses(policy)),
    };
  }

  async getPolicy(policyType: RefundPolicyType): Promise<RefundPolicyDto> {
    const policy = (await this.refundPolicyRepository.findPolicyByType(
      policyType,
    )) as RefundPolicyWithClauses | null;
    if (!policy) {
      throw new NotFoundException({
        messageKey: 'refundPolicies.errors.policyNotFound',
        error: 'REFUND_POLICY_NOT_FOUND',
        messageParams: { policyType },
      });
    }
    return toPolicyViewModelWithAllClauses(policy);
  }

  async getPublicPolicy(
    policyType: RefundPolicyType,
  ): Promise<RefundPolicyDto> {
    const policy = (await this.refundPolicyRepository.findPolicyByType(
      policyType,
    )) as RefundPolicyWithClauses | null;
    if (!policy || !policy.isActive) {
      throw new NotFoundException({
        messageKey: 'refundPolicies.errors.activePolicyNotFound',
        error: 'REFUND_POLICY_ACTIVE_NOT_FOUND',
        messageParams: { policyType },
      });
    }
    return toPolicyViewModel(policy);
  }

  async getPublicCurrent(): Promise<RefundPoliciesListViewModel> {
    const policies =
      (await this.refundPolicyRepository.listPolicies()) as RefundPolicyWithClauses[];
    return {
      items: policies
        .filter((policy) => policy.isActive)
        .map((policy) => toPolicyViewModel(policy)),
    };
  }

  async updatePolicy(
    policyType: RefundPolicyType,
    body: UpdateRefundPolicyDto,
  ): Promise<RefundPolicyDto> {
    const policy = (await this.refundPolicyRepository.upsertPolicy({
      policyType,
      key: REFUND_POLICY_KEYS[policyType],
      titleAr: body.titleAr ?? null,
      titleEn: body.titleEn ?? null,
      isActive: body.isActive ?? true,
    })) as RefundPolicyWithClauses;
    return toPolicyViewModelWithAllClauses(policy);
  }

  async createClause(
    policyType: RefundPolicyType,
    body: CreateRefundPolicyClauseDto,
  ): Promise<RefundPolicyDto> {
    const policy = await this.ensurePolicyFamily(policyType);
    const nextSortOrder =
      body.sortOrder ?? (policy.clauses.at(-1)?.sortOrder ?? 0) + 1;

    await this.refundPolicyRepository.createClause({
      policyId: policy.id,
      titleAr: body.titleAr ?? null,
      titleEn: body.titleEn ?? null,
      bodyAr: body.bodyAr,
      bodyEn: body.bodyEn,
      sortOrder: nextSortOrder,
      isActive: body.isActive ?? true,
    });

    return this.getPolicy(policyType);
  }

  async updateClause(
    policyType: RefundPolicyType,
    clauseId: string,
    body: CreateRefundPolicyClauseDto,
  ): Promise<RefundPolicyDto> {
    const clause = (await this.refundPolicyRepository.findClauseById(
      clauseId,
    )) as (RefundPolicyClause & { policy: RefundPolicyWithClauses }) | null;
    if (!clause || clause.policy.policyType !== policyType) {
      throw new NotFoundException({
        messageKey: 'refundPolicies.errors.clauseNotFound',
        error: 'REFUND_POLICY_CLAUSE_NOT_FOUND',
      });
    }

    await this.refundPolicyRepository.updateClause(clauseId, {
      titleAr: body.titleAr ?? null,
      titleEn: body.titleEn ?? null,
      bodyAr: body.bodyAr,
      bodyEn: body.bodyEn,
      sortOrder: body.sortOrder ?? clause.sortOrder,
      isActive: body.isActive ?? true,
    });

    return this.getPolicy(policyType);
  }

  async deleteClause(
    policyType: RefundPolicyType,
    clauseId: string,
  ): Promise<RefundPolicyDto> {
    const clause = (await this.refundPolicyRepository.findClauseById(
      clauseId,
    )) as (RefundPolicyClause & { policy: RefundPolicyWithClauses }) | null;
    if (!clause || clause.policy.policyType !== policyType) {
      throw new NotFoundException({
        messageKey: 'refundPolicies.errors.clauseNotFound',
        error: 'REFUND_POLICY_CLAUSE_NOT_FOUND',
      });
    }

    await this.refundPolicyRepository.deleteClause(clauseId);
    return this.getPolicy(policyType);
  }

  async reorderClauses(
    policyType: RefundPolicyType,
    body: ReorderRefundPolicyClausesDto,
  ): Promise<RefundPolicyDto> {
    const policy = (await this.refundPolicyRepository.findPolicyByType(
      policyType,
    )) as RefundPolicyWithClauses | null;
    if (!policy) {
      throw new NotFoundException({
        messageKey: 'refundPolicies.errors.policyNotFound',
        error: 'REFUND_POLICY_NOT_FOUND',
      });
    }

    const ids = new Set(policy.clauses.map((clause) => clause.id));
    const invalidItem = body.items.find((item) => !ids.has(item.id));
    if (invalidItem) {
      throw new BadRequestException({
        messageKey: 'refundPolicies.errors.clauseNotFound',
        error: 'REFUND_POLICY_CLAUSE_NOT_FOUND',
      });
    }

    await this.refundPolicyRepository.reorderClauses(
      policy.id,
      body.items.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
      })),
    );

    return this.getPolicy(policyType);
  }

  async ensureAcceptedRefundPolicyForPayment(
    input: AcceptanceInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (!input.acceptedRefundPolicyId) {
      throw new BadRequestException({
        messageKey: 'refundPolicies.errors.acceptanceRequired',
        error: 'REFUND_POLICY_ACCEPTANCE_REQUIRED',
      });
    }

    const db = this.getDb(tx);

    const existingAcceptance = await db.refundPolicyAcceptance.findUnique({
      where: { paymentId: input.paymentId },
    });

    if (existingAcceptance) {
      return existingAcceptance;
    }

    const policy = await db.refundPolicy.findUnique({
      where: { id: input.acceptedRefundPolicyId },
      include: {
        clauses: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!policy || !policy.isActive) {
      throw new NotFoundException({
        messageKey: 'refundPolicies.errors.activePolicyNotFound',
        error: 'REFUND_POLICY_ACTIVE_NOT_FOUND',
        messageParams: { policyType: input.policyType },
      });
    }

    if (policy.policyType !== input.policyType) {
      throw new BadRequestException({
        messageKey: 'refundPolicies.errors.wrongPolicyType',
        error: 'REFUND_POLICY_ACCEPTANCE_WRONG_TYPE',
        messageParams: { policyType: input.policyType },
      });
    }

    const clauseSnapshots = policy.clauses.map((clause) => ({
      id: clause.id,
      titleAr: clause.titleAr,
      titleEn: clause.titleEn,
      bodyAr: clause.bodyAr,
      bodyEn: clause.bodyEn,
      sortOrder: clause.sortOrder,
      isActive: clause.isActive,
    }));

    const snapshot = {
      policyType: policy.policyType,
      titleAr: policy.titleAr,
      titleEn: policy.titleEn,
      clauses: clauseSnapshots,
    };
    const snapshotHash = hashSnapshot(snapshot);

    return db.refundPolicyAcceptance.create({
      data: {
        policyId: policy.id,
        refundPolicyType: policy.policyType,
        acceptedAt: new Date(),
        acceptedByUserId: input.acceptedByUserId,
        paymentId: input.paymentId,
        sessionId: input.sessionId ?? null,
        packagePurchaseId: input.packagePurchaseId ?? null,
        policyVersionNumberSnapshot: 1,
        policyTypeSnapshot: policy.policyType,
        policyTitleArSnapshot: policy.titleAr,
        policyTitleEnSnapshot: policy.titleEn,
        policyTitleSnapshotJson: {
          ar: policy.titleAr,
          en: policy.titleEn,
        },
        policySummarySnapshotJson: {
          ar: policy.titleAr,
          en: policy.titleEn,
        },
        clausesSnapshotJson: clauseSnapshots,
        rulesSnapshotJson: [],
        contentHashSnapshot: snapshotHash,
        displayLocale: input.displayLocale,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        consentTextHash: snapshotHash,
        metadataJson:
          input.metadataJson === undefined
            ? undefined
            : input.metadataJson === null
              ? Prisma.JsonNull
              : cloneJson(input.metadataJson),
      },
    });
  }
}
