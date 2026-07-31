import { Injectable } from '@nestjs/common';
import { Session, SessionAdminDecisionType } from '@prisma/client';
import {
  buildSessionJoinAvailabilityViewModel,
  DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
} from '../utils/session-join-policy.util';
import { resolveSessionChatAvailability } from '../utils/session-chat-policy.util';
import {
  SessionDetailsViewModel,
  SessionListItemViewModel,
} from '../types/sessions.types';
import type { PatientSessionActionsViewModel } from '../services/resolve-patient-session-actions.service';

type SessionWithRelations = Session & {
  practitioner: {
    id: string;
    publicSlug: string;
    user: {
      displayName: string | null;
    };
  };
  patient: {
    id: string;
    user: {
      displayName: string | null;
    };
  };
};

@Injectable()
export class SessionMapper {
  toListItem(
    session: SessionWithRelations,
    now = new Date(),
    unreadCount = 0,
    finalManualDecision: SessionAdminDecisionType | null = null,
    actions?: PatientSessionActionsViewModel,
  ): SessionListItemViewModel {
    const joinAvailability = buildSessionJoinAvailabilityViewModel({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      videoRoomClosedAt: session.videoRoomClosedAt,
      now,
      runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      finalManualDecision,
    });

    return {
      id: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
      // Compatibility only: this no longer derives a competing display state.
      presentationStatus: session.status,
      createdAt: session.createdAt.toISOString(),
      scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
      durationMinutes: session.durationMinutes,
      sessionMode: session.sessionMode,
      practitioner: {
        id: session.practitioner.id,
        slug: session.practitioner.publicSlug,
        displayName: session.practitioner.user.displayName ?? null,
      },
      patient: {
        id: session.patient.id,
        displayName: session.patient.user.displayName ?? null,
      },
      joinAvailability,
      actions: actions ?? {
        canCancel: false,
        canPrepareRoom: false,
        canJoin: joinAvailability.canJoin,
        canPay:
          session.status === 'PENDING_PAYMENT' &&
          Boolean(session.expiresAt && session.expiresAt > now),
        canReview: false,
      },
      chatAvailability: resolveSessionChatAvailability({
        status: session.status,
        sessionMode: session.sessionMode,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        provider: session.provider,
        providerRoomId: session.providerRoomId,
        providerSessionRef: session.providerSessionRef,
        videoRoomClosedAt: session.videoRoomClosedAt,
        now,
        runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      }),
      unreadCount,
      hasUnread: unreadCount > 0,
    };
  }

  toDetails(
    session: SessionWithRelations,
    now = new Date(),
    unreadCount = 0,
    finalManualDecision: SessionAdminDecisionType | null = null,
    actions?: PatientSessionActionsViewModel,
  ): SessionDetailsViewModel {
    const base = this.toListItem(
      session,
      now,
      unreadCount,
      finalManualDecision,
      actions,
    );

    const rich = session as any;

    const patientDetails = rich.patient?.dateOfBirth || rich.patient?.gender || rich.patient?.country ? {
      dateOfBirth: rich.patient.dateOfBirth ? rich.patient.dateOfBirth.toISOString().split('T')[0] : null,
      gender: rich.patient.gender ?? null,
      preferredLanguage: rich.patient.user?.defaultLocale ?? null,
      country: rich.patient.country ? {
        isoCode: rich.patient.country.isoCode,
        name: rich.patient.country.name,
        nativeName: rich.patient.country.nativeName ?? null,
      } : null,
    } : null;

    const practitionerDetails = rich.practitioner?.professionalTitle || rich.practitioner?.avatarUrl || rich.practitioner?.specialties ? {
      professionalTitle: rich.practitioner.professionalTitle ?? null,
      avatarUrl: rich.practitioner.avatarUrl ?? null,
      specialties: (rich.practitioner.specialties || []).map((s: any) => ({
        id: s.specialty?.id,
        nameAr: s.specialty?.nameAr ?? null,
        nameEn: s.specialty?.nameEn ?? null,
        isPrimary: s.isPrimary,
      })),
    } : null;

    const primaryPayment = rich.payments && rich.payments.length > 0 ? rich.payments[0] : null;
    const paymentDetails = primaryPayment ? {
      id: primaryPayment.id,
      paymentPurpose: primaryPayment.paymentPurpose,
      status: primaryPayment.status,
      amountTotal: Number(primaryPayment.amountTotal),
      currencyCode: primaryPayment.currencyCode,
      provider: primaryPayment.provider,
      initiatedAt: primaryPayment.initiatedAt.toISOString(),
    } : null;

    const corporateSponsorshipDetails = rich.corporateSponsorship ? {
      id: rich.corporateSponsorship.id,
      coverageType: rich.corporateSponsorship.coverageType,
      originalAmount: Number(rich.corporateSponsorship.originalAmount),
      coveredAmount: Number(rich.corporateSponsorship.coveredAmount),
      patientPayAmount: Number(rich.corporateSponsorship.patientPayAmount),
      currency: rich.corporateSponsorship.currency,
      benefitPlanName: rich.corporateSponsorship.benefitPlan?.name ?? '',
      organizationName: rich.corporateSponsorship.organization?.name ?? '',
    } : null;

    const primaryReview = rich.reviews && rich.reviews.length > 0 ? rich.reviews[0] : null;
    const reviewDetails = primaryReview ? {
      id: primaryReview.id,
      ratingValue: primaryReview.ratingValue,
      reviewTitle: primaryReview.reviewTitle ?? null,
      reviewText: primaryReview.reviewText ?? null,
      submittedAt: primaryReview.submittedAt ? primaryReview.submittedAt.toISOString() : null,
    } : null;

    const timeline = (rich.events || []).map((e: any) => ({
      eventType: e.eventType,
      occurredAt: e.occurredAt?.toISOString() ?? e.createdAt.toISOString(),
      actorType: e.actorType ?? null,
      reason: e.reason ?? null,
    }));

    const conversationId = rich.conversations && rich.conversations.length > 0 ? rich.conversations[0].id : null;

    const packagePurchase = rich.packagePurchase
      ? {
          id: rich.packagePurchase.id,
          packagePlanId: rich.packagePurchase.packagePlanId,
          packagePlan: {
            id: rich.packagePurchase.packagePlan.id,
            code: rich.packagePurchase.packagePlan.code,
            title: rich.packagePurchase.packagePlan.title,
            discountPercent: rich.packagePurchase.packagePlan.discountPercent,
          },
        }
      : null;

    return {
      ...base,
      flowType: session.flowType,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      cancelledAt: session.cancelledAt?.toISOString() ?? null,
      cancellationReason: session.cancellationReason ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      expiredAt: session.expiredAt?.toISOString() ?? null,
      timezone: session.timezoneSnapshot ?? null,
      videoRoomClosedAt: session.videoRoomClosedAt?.toISOString() ?? null,
      videoRoomCloseReason: session.videoRoomCloseReason ?? null,
      videoRoomCloseNote: session.videoRoomCloseNote ?? null,
      conversationId,
      patientDetails,
      practitionerDetails,
      paymentDetails,
      corporateSponsorshipDetails,
      reviewDetails,
      timeline,
      packagePurchase,
      paymentCoverageType: session.paymentCoverageType,
    };
  }
}
