import { Injectable } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  FinanceOperationSortByDto,
  FinanceOperationSortOrderDto,
  FinanceOperationTypeDto,
} from '../dto/list-finance-operation-events.dto';

@Injectable()
export class FinancialOperationsPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim(),
    );
  }

  findCapturedPaymentById(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        commissionRule: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });
  }

  findRefundForPosting(refundId: string) {
    return this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: true,
      },
    });
  }

  async listFinanceOperationEvents(input: {
    operationType?: FinanceOperationTypeDto;
    provider?: PaymentProvider;
    paymentPurpose?: PaymentPurpose;
    paymentStatus?: PaymentStatus;
    refundStatus?: RefundStatus;
    paymentId?: string;
    refundId?: string;
    occurredFrom?: Date;
    occurredTo?: Date;
    query?: string;
    sortBy: FinanceOperationSortByDto;
    sortOrder: FinanceOperationSortOrderDto;
    page: number;
    limit: number;
  }) {
    const normalizedQuery = input.query?.trim() ?? '';
    const queryIsUuid =
      normalizedQuery.length > 0 && this.isUuid(normalizedQuery);

    const includePaymentEvents =
      !input.operationType ||
      input.operationType === FinanceOperationTypeDto.PAYMENT;
    const includeRefunds =
      !input.operationType ||
      input.operationType === FinanceOperationTypeDto.REFUND;

    const paymentEvents = includePaymentEvents
      ? await this.prisma.paymentEvent.findMany({
          where: {
            paymentId: input.paymentId,
            ...(input.occurredFrom || input.occurredTo
              ? {
                  createdAt: {
                    ...(input.occurredFrom ? { gte: input.occurredFrom } : {}),
                    ...(input.occurredTo ? { lte: input.occurredTo } : {}),
                  },
                }
              : {}),
            ...(input.query
              ? {
                  OR: [
                    ...(queryIsUuid ? [{ id: normalizedQuery }] : []),
                    {
                      providerEventRef: {
                        contains: normalizedQuery,
                        mode: 'insensitive',
                      },
                    },
                    {
                      payment: {
                        providerPaymentRef: {
                          contains: normalizedQuery,
                          mode: 'insensitive',
                        },
                      },
                    },
                    {
                      payment: {
                        providerOrderRef: {
                          contains: normalizedQuery,
                          mode: 'insensitive',
                        },
                      },
                    },
                    {
                      payment: {
                        patient: {
                          displayName: {
                            contains: normalizedQuery,
                            mode: 'insensitive',
                          },
                        },
                      },
                    },
                    {
                      payment: {
                        patient: {
                          user: {
                            displayName: {
                              contains: normalizedQuery,
                              mode: 'insensitive',
                            },
                          },
                        },
                      },
                    },
                    {
                      payment: {
                        practitioner: {
                          user: {
                            displayName: {
                              contains: normalizedQuery,
                              mode: 'insensitive',
                            },
                          },
                        },
                      },
                    },
                  ],
                }
              : {}),
            payment: {
              provider: input.provider,
              paymentPurpose: input.paymentPurpose,
              status: input.paymentStatus,
            },
          },
          include: {
            payment: {
              select: {
                id: true,
                provider: true,
                paymentPurpose: true,
                status: true,
                providerPaymentRef: true,
                providerOrderRef: true,
                sessionId: true,
                patientId: true,
                practitionerId: true,
                patient: {
                  select: {
                    displayName: true,
                    user: {
                      select: {
                        displayName: true,
                      },
                    },
                  },
                },
                practitioner: {
                  select: {
                    user: {
                      select: {
                        displayName: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { createdAt: input.sortOrder.toLowerCase() as 'asc' | 'desc' },
            { id: 'asc' },
          ],
        })
      : [];

    const refunds = includeRefunds
      ? await this.prisma.refund.findMany({
          where: {
            id: input.refundId,
            paymentId: input.paymentId,
            status: input.refundStatus,
            ...(input.occurredFrom || input.occurredTo
              ? {
                  requestedAt: {
                    ...(input.occurredFrom ? { gte: input.occurredFrom } : {}),
                    ...(input.occurredTo ? { lte: input.occurredTo } : {}),
                  },
                }
              : {}),
            ...(input.query
              ? {
                  OR: [
                    ...(queryIsUuid ? [{ id: normalizedQuery }] : []),
                    {
                      providerRefundRef: {
                        contains: normalizedQuery,
                        mode: 'insensitive',
                      },
                    },
                    {
                      refundReason: {
                        contains: normalizedQuery,
                        mode: 'insensitive',
                      },
                    },
                    {
                      payment: {
                        providerPaymentRef: {
                          contains: normalizedQuery,
                          mode: 'insensitive',
                        },
                      },
                    },
                    {
                      payment: {
                        patient: {
                          displayName: {
                            contains: normalizedQuery,
                            mode: 'insensitive',
                          },
                        },
                      },
                    },
                    {
                      payment: {
                        patient: {
                          user: {
                            displayName: {
                              contains: normalizedQuery,
                              mode: 'insensitive',
                            },
                          },
                        },
                      },
                    },
                    {
                      payment: {
                        practitioner: {
                          user: {
                            displayName: {
                              contains: normalizedQuery,
                              mode: 'insensitive',
                            },
                          },
                        },
                      },
                    },
                  ],
                }
              : {}),
            payment: {
              provider: input.provider,
              paymentPurpose: input.paymentPurpose,
              status: input.paymentStatus,
            },
          },
          include: {
            payment: {
              select: {
                id: true,
                provider: true,
                paymentPurpose: true,
                status: true,
                providerPaymentRef: true,
                providerOrderRef: true,
                sessionId: true,
                patientId: true,
                practitionerId: true,
                patient: {
                  select: {
                    displayName: true,
                    user: {
                      select: {
                        displayName: true,
                      },
                    },
                  },
                },
                practitioner: {
                  select: {
                    user: {
                      select: {
                        displayName: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { requestedAt: input.sortOrder.toLowerCase() as 'asc' | 'desc' },
            { id: 'asc' },
          ],
        })
      : [];

    const merged = [
      ...paymentEvents.map((event) => ({
        id: event.id,
        operationType: FinanceOperationTypeDto.PAYMENT,
        paymentId: event.payment.id,
        refundId: null,
        provider: event.payment.provider,
        paymentPurpose: event.payment.paymentPurpose,
        paymentStatus: event.payment.status,
        refundStatus: null,
        externalRef:
          event.providerEventRef ?? event.payment.providerPaymentRef ?? null,
        summary: this.summarizePaymentEvent(event.eventType),
        occurredAt: event.createdAt,
        createdAt: event.createdAt,
        linkedSessionId: event.payment.sessionId ?? null,
        linkedPatientId: event.payment.patientId ?? null,
        linkedPractitionerId: event.payment.practitionerId ?? null,
        patientDisplayName:
          event.payment.patient?.displayName ??
          event.payment.patient?.user.displayName ??
          null,
        practitionerDisplayName:
          event.payment.practitioner?.user.displayName ?? null,
      })),
      ...refunds.map((refund) => ({
        id: refund.id,
        operationType: FinanceOperationTypeDto.REFUND,
        paymentId: refund.paymentId,
        refundId: refund.id,
        provider: refund.payment.provider,
        paymentPurpose: refund.payment.paymentPurpose,
        paymentStatus: refund.payment.status,
        refundStatus: refund.status,
        externalRef:
          refund.providerRefundRef ?? refund.payment.providerPaymentRef ?? null,
        summary: this.summarizeRefundEvent(refund.status),
        occurredAt: refund.requestedAt,
        createdAt: refund.createdAt,
        linkedSessionId: refund.sessionId ?? refund.payment.sessionId ?? null,
        linkedPatientId: refund.payment.patientId ?? null,
        linkedPractitionerId: refund.payment.practitionerId ?? null,
        patientDisplayName:
          refund.payment.patient?.displayName ??
          refund.payment.patient?.user.displayName ??
          null,
        practitionerDisplayName:
          refund.payment.practitioner?.user.displayName ?? null,
      })),
    ];

    const sorted = merged.sort((a, b) => {
      const left =
        input.sortBy === FinanceOperationSortByDto.CREATED_AT
          ? a.createdAt
          : a.occurredAt;
      const right =
        input.sortBy === FinanceOperationSortByDto.CREATED_AT
          ? b.createdAt
          : b.occurredAt;
      const direction =
        input.sortOrder === FinanceOperationSortOrderDto.ASC ? 1 : -1;

      if (left.getTime() !== right.getTime()) {
        return (left.getTime() - right.getTime()) * direction;
      }
      if (a.operationType !== b.operationType) {
        return a.operationType.localeCompare(b.operationType);
      }
      return a.id.localeCompare(b.id);
    });

    const totalItems = sorted.length;
    const skip = (input.page - 1) * input.limit;
    const items = sorted.slice(skip, skip + input.limit);

    return [items, totalItems] as const;
  }

  async findFinanceOperationEventById(eventId: string) {
    const paymentEvent = await this.prisma.paymentEvent.findUnique({
      where: { id: eventId },
      include: {
        payment: {
          select: {
            id: true,
            provider: true,
            paymentPurpose: true,
            status: true,
            providerPaymentRef: true,
            providerOrderRef: true,
            sessionId: true,
            patientId: true,
            practitionerId: true,
            patient: {
              select: {
                displayName: true,
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
            practitioner: {
              select: {
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
            events: {
              orderBy: [{ createdAt: 'desc' }],
              take: 1,
              select: {
                id: true,
                eventType: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (paymentEvent) {
      return {
        id: paymentEvent.id,
        operationType: FinanceOperationTypeDto.PAYMENT,
        paymentId: paymentEvent.payment.id,
        refundId: null,
        provider: paymentEvent.payment.provider,
        paymentPurpose: paymentEvent.payment.paymentPurpose,
        paymentStatus: paymentEvent.payment.status,
        refundStatus: null,
        externalRef:
          paymentEvent.providerEventRef ??
          paymentEvent.payment.providerPaymentRef ??
          null,
        summary: this.summarizePaymentEvent(paymentEvent.eventType),
        occurredAt: paymentEvent.createdAt,
        createdAt: paymentEvent.createdAt,
        linkedSessionId: paymentEvent.payment.sessionId ?? null,
        linkedPatientId: paymentEvent.payment.patientId ?? null,
        linkedPractitionerId: paymentEvent.payment.practitionerId ?? null,
        patientDisplayName:
          paymentEvent.payment.patient?.displayName ??
          paymentEvent.payment.patient?.user.displayName ??
          null,
        practitionerDisplayName:
          paymentEvent.payment.practitioner?.user.displayName ?? null,
      };
    }

    const refund = await this.prisma.refund.findUnique({
      where: { id: eventId },
      include: {
        payment: {
          select: {
            id: true,
            provider: true,
            paymentPurpose: true,
            status: true,
            providerPaymentRef: true,
            providerOrderRef: true,
            sessionId: true,
            patientId: true,
            practitionerId: true,
            patient: {
              select: {
                displayName: true,
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
            practitioner: {
              select: {
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!refund) {
      return null;
    }

    return {
      id: refund.id,
      operationType: FinanceOperationTypeDto.REFUND,
      paymentId: refund.paymentId,
      refundId: refund.id,
      provider: refund.payment.provider,
      paymentPurpose: refund.payment.paymentPurpose,
      paymentStatus: refund.payment.status,
      refundStatus: refund.status,
      externalRef:
        refund.providerRefundRef ?? refund.payment.providerPaymentRef ?? null,
      summary: this.summarizeRefundEvent(refund.status),
      occurredAt: refund.requestedAt,
      createdAt: refund.createdAt,
      linkedSessionId: refund.sessionId ?? refund.payment.sessionId ?? null,
      linkedPatientId: refund.payment.patientId ?? null,
      linkedPractitionerId: refund.payment.practitionerId ?? null,
      patientDisplayName:
        refund.payment.patient?.displayName ??
        refund.payment.patient?.user.displayName ??
        null,
      practitionerDisplayName:
        refund.payment.practitioner?.user.displayName ?? null,
    };
  }

  private summarizePaymentEvent(eventType: PaymentEventType): string {
    switch (eventType) {
      case PaymentEventType.PAYMENT_CAPTURED:
        return 'Payment captured';
      case PaymentEventType.PAYMENT_FAILED:
        return 'Payment failed';
      case PaymentEventType.REFUND_REQUESTED:
        return 'Refund requested';
      case PaymentEventType.REFUND_PROCESSED:
        return 'Refund processed';
      default:
        return eventType;
    }
  }

  private summarizeRefundEvent(status: RefundStatus): string {
    switch (status) {
      case RefundStatus.REQUESTED:
        return 'Refund requested';
      case RefundStatus.PROCESSING:
        return 'Refund processing';
      case RefundStatus.SUCCEEDED:
        return 'Refund succeeded';
      case RefundStatus.FAILED:
        return 'Refund failed';
      case RefundStatus.CANCELLED:
        return 'Refund cancelled';
      default:
        return status;
    }
  }
}
