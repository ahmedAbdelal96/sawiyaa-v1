import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
  PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE,
} from '../payment-gateway-control.constants';
import { PaymentGatewayControlScope } from '../types/payment-gateway-control.types';

@Injectable()
export class PaymentGatewayControlRepository {
  constructor(private readonly prisma: PrismaService) {}

  listHistory(input: {
    scope: PaymentGatewayControlScope;
    provider: PaymentProvider | null;
  }) {
    return this.prisma.auditEvent.findMany({
      where: {
        targetEntityType:
          input.scope === 'routing'
            ? PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE
            : PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
        targetEntityId: input.scope === 'routing' ? null : input.provider,
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        actorUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  findHistoryEvent(input: {
    scope: PaymentGatewayControlScope;
    provider: PaymentProvider | null;
    eventId: string;
  }) {
    return this.prisma.auditEvent.findFirst({
      where: {
        id: input.eventId,
        targetEntityType:
          input.scope === 'routing'
            ? PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE
            : PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
        targetEntityId: input.scope === 'routing' ? null : input.provider,
      },
    });
  }
}
