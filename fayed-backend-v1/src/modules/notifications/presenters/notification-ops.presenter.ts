import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationOpsPresenter {
  presentPagination(input: {
    page: number;
    limit: number;
    totalItems: number;
  }) {
    return {
      page: input.page,
      limit: input.limit,
      totalItems: input.totalItems,
      totalPages: Math.max(1, Math.ceil(input.totalItems / input.limit)),
    };
  }

  toListItem(input: {
    id: string;
    status: string;
    channel: string;
    notificationType: { category: string; slug: string };
    userId: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    scheduledFor: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    suppressedReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: { deliveryAttempts: number };
    deliveryAttempts: Array<{
      status: string;
      errorCode: string | null;
      attemptedAt: Date;
    }>;
  }) {
    return {
      id: input.id,
      status: input.status,
      channel: input.channel,
      category: input.notificationType.category,
      typeSlug: input.notificationType.slug,
      userId: input.userId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      scheduledFor: input.scheduledFor?.toISOString() ?? null,
      sentAt: input.sentAt?.toISOString() ?? null,
      failedAt: input.failedAt?.toISOString() ?? null,
      suppressedReason: input.suppressedReason,
      attemptsCount: input._count.deliveryAttempts,
      latestAttemptStatus: input.deliveryAttempts[0]?.status ?? null,
      latestAttemptErrorCode: input.deliveryAttempts[0]?.errorCode ?? null,
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
    };
  }

  toDetailItem(input: {
    id: string;
    status: string;
    channel: string;
    userId: string;
    locale: string | null;
    titleSnapshot: string | null;
    subjectSnapshot: string | null;
    bodySnapshot: string | null;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    scheduledFor: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    suppressedReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    notificationType: {
      category: string;
      slug: string;
    };
    deliveryAttempts: Array<{
      id: string;
      attemptNumber: number;
      status: string;
      provider: string | null;
      errorCode: string | null;
      errorMessage: string | null;
      attemptedAt: Date;
    }>;
  }) {
    return {
      id: input.id,
      status: input.status,
      channel: input.channel,
      category: input.notificationType.category,
      typeSlug: input.notificationType.slug,
      userId: input.userId,
      locale: input.locale,
      titleSnapshot: input.titleSnapshot,
      subjectSnapshot: input.subjectSnapshot,
      bodySnapshot: input.bodySnapshot,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      scheduledFor: input.scheduledFor?.toISOString() ?? null,
      sentAt: input.sentAt?.toISOString() ?? null,
      failedAt: input.failedAt?.toISOString() ?? null,
      suppressedReason: input.suppressedReason,
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
      attempts: input.deliveryAttempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        provider: attempt.provider,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
        attemptedAt: attempt.attemptedAt.toISOString(),
      })),
    };
  }
}
