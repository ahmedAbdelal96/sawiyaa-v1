import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentOperationalExceptionStatus,
  PaymentOperationalExceptionType,
  Prisma,
  SecurityAuditOutcome,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditSource } from '@common/security-audit/security-audit.types';

@Injectable()
export class PaymentOperationalExceptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async create(input: {
    paymentId: string;
    type: PaymentOperationalExceptionType;
    reason: string;
    ownerUserId?: string;
    dedupeKey?: string;
    actorUserId: string;
    actorRoles?: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: input.paymentId },
        select: { id: true, provider: true },
      });
      if (!payment) throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });

      const dedupeKey = input.dedupeKey ?? `${input.paymentId}:${input.type}`;
      const exception = await tx.paymentOperationalException.upsert({
        where: {
          dedupeKey,
        },
        create: {
          paymentId: payment.id,
          type: input.type,
          status: PaymentOperationalExceptionStatus.OPEN,
          provider: payment.provider,
          ownerUserId: input.ownerUserId ?? null,
          reason: input.reason.trim(),
          dedupeKey,
          createdByUserId: input.actorUserId,
        },
        update: {},
      });

      await this.securityAuditService.recordRequired(tx, {
        action: 'finance.payment_exception.open',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.actorUserId,
        actorRoles: input.actorRoles,
        source: SecurityAuditSource.HTTP_REQUEST,
        resourceType: 'PaymentOperationalException',
        resourceId: exception.id,
        reason: input.reason,
        metadata: { paymentId: payment.id, type: input.type, provider: payment.provider },
      });

      return exception;
    });
  }

  list(query: {
    type?: PaymentOperationalExceptionType;
    status?: PaymentOperationalExceptionStatus;
    provider?: string;
    createdFrom?: string;
    createdTo?: string;
  }) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.createdFrom) createdAt.gte = new Date(query.createdFrom);
    if (query.createdTo) createdAt.lte = new Date(query.createdTo);
    return this.prisma.paymentOperationalException.findMany({
      where: {
        type: query.type,
        status: query.status,
        provider: query.provider as never,
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true, paymentId: true, type: true, status: true, provider: true,
        ownerUserId: true, reason: true, resolutionNote: true, createdAt: true, resolvedAt: true,
      },
    });
  }

  async get(id: string) {
    const exception = await this.prisma.paymentOperationalException.findUnique({
      where: { id },
      select: {
        id: true, paymentId: true, type: true, status: true, provider: true,
        ownerUserId: true, reason: true, resolutionNote: true, createdAt: true, resolvedAt: true,
      },
    });
    if (!exception) throw new NotFoundException({ error: 'PAYMENT_EXCEPTION_NOT_FOUND' });
    const auditTrail = await this.prisma.securityAuditLog.findMany({
      where: { resourceType: 'PaymentOperationalException', resourceId: id },
      orderBy: [{ occurredAt: 'asc' }],
      select: { id: true, action: true, outcome: true, actorUserId: true, reason: true, occurredAt: true },
    });
    return { ...exception, auditTrail };
  }

  async resolve(input: {
    id: string;
    status: PaymentOperationalExceptionStatus;
    resolutionNote: string;
    actorUserId: string;
    actorRoles?: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.paymentOperationalException.findUnique({ where: { id: input.id } });
      if (!current) throw new NotFoundException({ error: 'PAYMENT_EXCEPTION_NOT_FOUND' });
      const resolved = await tx.paymentOperationalException.update({
        where: { id: input.id },
        data: {
          status: input.status,
          resolutionNote: input.resolutionNote.trim(),
          resolvedAt: input.status === PaymentOperationalExceptionStatus.RESOLVED || input.status === PaymentOperationalExceptionStatus.DISMISSED ? new Date() : null,
        },
      });
      await this.securityAuditService.recordRequired(tx, {
        action: 'finance.payment_exception.resolve',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.actorUserId,
        actorRoles: input.actorRoles,
        source: SecurityAuditSource.HTTP_REQUEST,
        resourceType: 'PaymentOperationalException',
        resourceId: input.id,
        reason: input.resolutionNote,
        metadata: { status: input.status, paymentId: current.paymentId },
      });
      return resolved;
    });
  }
}
