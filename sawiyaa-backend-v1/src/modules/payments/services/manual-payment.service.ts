import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ManualPaymentAvailabilityMode,
  ManualPaymentSubmissionStatus,
  PaymentProvider,
  PaymentStatus,
  NotificationCategory,
  SecurityAuditOutcome,
  StoredFilePurpose,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigRuntimeService } from '@modules/config/services/config-runtime.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType } from '@common/security-audit/security-audit.types';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';
import { MarkPaymentSucceededUseCase } from '../use-cases/mark-payment-succeeded.use-case';
import { NotificationIntentWriterService } from '@modules/notifications/services/notification-intent-writer.service';
import {
  ListManualPaymentSubmissionsDto,
  RejectManualPaymentDto,
  SubmitManualPaymentDto,
  UpsertManualPaymentMethodDto,
} from '../dto/manual-payment.dto';

type ManualActor = { id: string; roles?: string[] };
type UploadedProof = {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
};

const MANUAL_ENABLED_DOMAINS_KEY =
  'payments.manualPayment.enabledDomains' as const;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

@Injectable()
export class ManualPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configRuntime: ConfigRuntimeService,
    private readonly storage: UnifiedFileStorageService,
    private readonly audit: SecurityAuditService,
    private readonly markPaymentSucceeded: MarkPaymentSucceededUseCase,
    private readonly notificationWriter: NotificationIntentWriterService,
  ) {}

  async listAvailableMethods(countryIsoCode: string | null) {
    await this.assertDomainEnabled('ACADEMY');
    const country = this.normalizeCountry(countryIsoCode);
    const methods = await this.prisma.manualPaymentMethod.findMany({
      where: { isEnabled: true },
      include: { countries: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      items: methods
        .filter((method) => this.isEligible(method, country))
        .map((method) => this.presentMethod(method)),
    };
  }

  async listMethods() {
    const methods = await this.prisma.manualPaymentMethod.findMany({
      include: { countries: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return methods.map((method) => this.presentMethod(method));
  }

  async createMethod(input: {
    payload: UpsertManualPaymentMethodDto;
    actor: ManualActor;
  }) {
    const payload = this.normalizeMethodPayload(input.payload);
    const created = await this.prisma.$transaction(async (tx) => {
      const method = await tx.manualPaymentMethod.create({
        data: {
          code: payload.code,
          type: payload.type,
          displayNameAr: payload.displayNameAr,
          displayNameEn: payload.displayNameEn,
          accountHolderName: payload.accountHolderName,
          accountIdentifier: payload.accountIdentifier,
          instructionsAr: payload.instructionsAr,
          instructionsEn: payload.instructionsEn,
          availabilityMode: payload.availabilityMode,
          sortOrder: payload.sortOrder,
          isEnabled: payload.isEnabled,
          createdByUserId: input.actor.id,
          updatedByUserId: input.actor.id,
          countries: payload.availabilityMode === ManualPaymentAvailabilityMode.SELECTED
            ? { create: payload.countryIsoCodes.map((countryIsoCode) => ({ countryIsoCode })) }
            : undefined,
        },
        include: { countries: true },
      });
      await this.audit.recordRequired(tx, {
        action: 'MANUAL_PAYMENT_METHOD_CREATED',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        resourceType: 'ManualPaymentMethod',
        resourceId: method.id,
        metadata: { code: method.code, type: method.type },
      });
      return method;
    });
    return { item: this.presentMethod(created) };
  }

  async updateMethod(input: {
    id: string;
    payload: UpsertManualPaymentMethodDto;
    actor: ManualActor;
  }) {
    const payload = this.normalizeMethodPayload(input.payload);
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.manualPaymentMethod.findUnique({ where: { id: input.id } });
      if (!current) throw new NotFoundException({ error: 'MANUAL_PAYMENT_METHOD_NOT_FOUND' });
      const method = await tx.manualPaymentMethod.update({
        where: { id: input.id },
        data: {
          code: payload.code,
          type: payload.type,
          displayNameAr: payload.displayNameAr,
          displayNameEn: payload.displayNameEn,
          accountHolderName: payload.accountHolderName,
          accountIdentifier: payload.accountIdentifier,
          instructionsAr: payload.instructionsAr,
          instructionsEn: payload.instructionsEn,
          availabilityMode: payload.availabilityMode,
          sortOrder: payload.sortOrder,
          isEnabled: payload.isEnabled,
          disabledAt: payload.isEnabled ? null : new Date(),
          updatedByUserId: input.actor.id,
          countries: {
            deleteMany: {},
            ...(payload.availabilityMode === ManualPaymentAvailabilityMode.SELECTED
              ? { create: payload.countryIsoCodes.map((countryIsoCode) => ({ countryIsoCode })) }
              : {}),
          },
        },
        include: { countries: true },
      });
      await this.audit.recordRequired(tx, {
        action: 'MANUAL_PAYMENT_METHOD_UPDATED',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        resourceType: 'ManualPaymentMethod',
        resourceId: method.id,
        metadata: { code: method.code },
      });
      return method;
    });
    return { item: this.presentMethod(updated) };
  }

  async setMethodEnabled(input: { id: string; enabled: boolean; actor: ManualActor }) {
    const method = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.manualPaymentMethod.update({
        where: { id: input.id },
        data: {
          isEnabled: input.enabled,
          disabledAt: input.enabled ? null : new Date(),
          updatedByUserId: input.actor.id,
        },
        include: { countries: true },
      });
      await this.audit.recordRequired(tx, {
        action: input.enabled ? 'MANUAL_PAYMENT_METHOD_ENABLED' : 'MANUAL_PAYMENT_METHOD_DISABLED',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        resourceType: 'ManualPaymentMethod',
        resourceId: input.id,
      });
      return updated;
    });
    return { item: this.presentMethod(method) };
  }

  async submit(input: {
    enrollmentId: string;
    token?: string;
    userId?: string;
    countryIsoCode: string | null;
    payload: SubmitManualPaymentDto;
    proof?: UploadedProof;
  }) {
    await this.assertDomainEnabled('ACADEMY');
    if (!input.proof) throw new BadRequestException({ error: 'MANUAL_PAYMENT_PROOF_REQUIRED' });
    if (!IMAGE_MIME_TYPES.includes(input.proof.mimetype.trim().toLowerCase() as (typeof IMAGE_MIME_TYPES)[number])) {
      throw new BadRequestException({ error: 'MANUAL_PAYMENT_PROOF_TYPE_NOT_ALLOWED' });
    }

    const enrollment = await this.findAuthorizedEnrollment(input.enrollmentId, input.token, input.userId);
    if (!enrollment.paymentId) throw new BadRequestException({ error: 'MANUAL_PAYMENT_PAYMENT_NOT_READY' });
    const payment = await this.prisma.payment.findUnique({ where: { id: enrollment.paymentId } });
    if (!payment || payment.provider !== PaymentProvider.MANUAL) {
      throw new BadRequestException({ error: 'MANUAL_PAYMENT_NOT_SELECTED' });
    }
    if (!this.isManualPaymentSubmittableStatus(payment.status)) {
      throw new ConflictException({ error: 'MANUAL_PAYMENT_NOT_SUBMITTABLE' });
    }

    const method = await this.prisma.manualPaymentMethod.findUnique({
      where: { id: input.payload.methodId },
      include: { countries: true },
    });
    const country = this.normalizeCountry(input.countryIsoCode ?? enrollment.lockedCountry);
    if (!method || !method.isEnabled || !this.isEligible(method, country)) {
      throw new BadRequestException({ error: 'MANUAL_PAYMENT_METHOD_NOT_AVAILABLE' });
    }

    const stored = await this.storage.store({
      purpose: StoredFilePurpose.MANUAL_PAYMENT_PROOF,
      fileBuffer: input.proof.buffer,
      mimeType: input.proof.mimetype,
      originalFileName: input.proof.originalname ?? null,
      uploadedByUserId: input.userId ?? null,
      maxBytes: 5 * 1024 * 1024,
      allowedMimeTypes: IMAGE_MIME_TYPES,
    });

    let submission: Awaited<ReturnType<PrismaService['manualPaymentSubmission']['create']>>;
    try {
      submission = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id})::bigint)`;
        const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
        const currentEnrollment = await tx.academyProgramEnrollment.findUnique({
          where: { id: enrollment.id },
          include: { academyProgram: true },
        });
        if (!currentPayment || currentPayment.provider !== PaymentProvider.MANUAL) {
          throw new ConflictException({ error: 'MANUAL_PAYMENT_NOT_SELECTED' });
        }
        if (!this.isManualPaymentSubmittableStatus(currentPayment.status)) {
          throw new ConflictException({ error: 'MANUAL_PAYMENT_NOT_SUBMITTABLE' });
        }
        const now = new Date();
        const viableUntil = currentEnrollment?.academyProgram.endAt ?? null;
        const reservationUntil = currentEnrollment?.seatReservationExpiresAt ?? null;
        const resubmitUntil = currentEnrollment?.seatReservationExpiresAt && currentEnrollment.seatReservationExpiresAt > now
          ? currentEnrollment.seatReservationExpiresAt
          : reservationUntil;
        if (!currentEnrollment || currentEnrollment.status !== 'PENDING_PAYMENT' || !resubmitUntil || resubmitUntil <= now) {
          throw new ConflictException({ error: 'MANUAL_PAYMENT_RESERVATION_EXPIRED' });
        }
        const active = await tx.manualPaymentSubmission.findFirst({
          where: { paymentId: payment.id, status: ManualPaymentSubmissionStatus.UNDER_REVIEW },
        });
        if (active) throw new ConflictException({ error: 'MANUAL_PAYMENT_SUBMISSION_ALREADY_UNDER_REVIEW' });
        const latest = await tx.manualPaymentSubmission.findFirst({
          where: { paymentId: payment.id }, orderBy: { attemptNumber: 'desc' }, select: { attemptNumber: true },
        });
        const created = await tx.manualPaymentSubmission.create({
          data: {
            paymentId: payment.id,
            manualPaymentMethodId: method.id,
            attemptNumber: (latest?.attemptNumber ?? 0) + 1,
            status: ManualPaymentSubmissionStatus.UNDER_REVIEW,
            senderAccountName: input.payload.senderAccountName.trim(),
            proofStoredFileId: stored.id,
            notes: input.payload.notes?.trim() || null,
            submittedAt: now,
            paymentAmountSnapshot: currentPayment.amountTotal,
            paymentCurrencySnapshot: currentPayment.currencyCode,
            methodTypeSnapshot: method.type,
            methodDisplayNameArSnapshot: method.displayNameAr,
            methodDisplayNameEnSnapshot: method.displayNameEn,
            accountHolderSnapshot: method.accountHolderName,
            accountIdentifierSnapshot: method.accountIdentifier,
            instructionsArSnapshot: method.instructionsAr,
            instructionsEnSnapshot: method.instructionsEn,
            countrySnapshot: country,
          },
        });
        await this.audit.recordRequired(tx, {
          action: 'MANUAL_PAYMENT_SUBMISSION_CREATED',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: input.userId ? SecurityAuditActorType.USER : SecurityAuditActorType.SYSTEM,
          actorUserId: input.userId,
          resourceType: 'ManualPaymentSubmission',
          resourceId: created.id,
          targetUserId: currentEnrollment.userId,
          metadata: { paymentId: payment.id, attemptNumber: created.attemptNumber, viableUntil },
        });
        return created;
      });
    } catch (error) {
      await this.storage.delete(stored.id).catch(() => undefined);
      throw error;
    }
    await Promise.allSettled([
      this.notifyReviewers(submission.id, payment.id),
      enrollment.userId ? this.notifyPatientSubmission(enrollment.userId, submission.id, payment.id) : Promise.resolve(),
    ]);
    return { item: this.presentSubmission(submission) };
  }

  async listSubmissions(query: ListManualPaymentSubmissionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.manualPaymentSubmission.findMany({
        where,
        include: {
          payment: {
            include: {
              academyProgramEnrollment: { include: { academyProgram: true, user: true } },
            },
          },
          manualPaymentMethod: true,
        },
        orderBy: { submittedAt: 'asc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.manualPaymentSubmission.count({ where }),
    ]);
    return { items: items.map((item) => this.presentSubmission(item)), meta: { page, limit, total } };
  }

  async listPatientSubmissions(input: { enrollmentId: string; token?: string; userId?: string }) {
    const enrollment = await this.findAuthorizedEnrollment(input.enrollmentId, input.token, input.userId);
    const items = await this.prisma.manualPaymentSubmission.findMany({
      where: { paymentId: enrollment.paymentId ?? '__missing__' },
      include: { manualPaymentMethod: true },
      orderBy: { attemptNumber: 'desc' },
    });
    return { items: items.map((item) => this.presentSubmission(item)) };
  }

  async getSubmission(id: string) {
    const item = await this.prisma.manualPaymentSubmission.findUnique({
      where: {
        id,
      },
      include: {
        payment: {
          include: {
            academyProgramEnrollment: { include: { academyProgram: true, user: true } },
          },
        },
        manualPaymentMethod: true,
        proofStoredFile: true,
      },
    });
    if (!item) throw new NotFoundException({ error: 'MANUAL_PAYMENT_SUBMISSION_NOT_FOUND' });
    return { item: this.presentSubmission(item) };
  }

  async approve(input: { id: string; actor: ManualActor }) {
    const claimed = await this.prisma.$transaction(async (tx) => {
      const item = await tx.manualPaymentSubmission.findUnique({ where: { id: input.id }, include: { payment: true } });
      if (!item) throw new NotFoundException({ error: 'MANUAL_PAYMENT_SUBMISSION_NOT_FOUND' });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${item.paymentId})::bigint)`;
      const current = await tx.manualPaymentSubmission.findUnique({ where: { id: input.id }, include: { payment: true } });
      if (!current || current.status !== ManualPaymentSubmissionStatus.UNDER_REVIEW || current.reviewedAt) {
        throw new ConflictException({ error: 'MANUAL_PAYMENT_SUBMISSION_NOT_REVIEWABLE' });
      }
      if (current.payment.status === PaymentStatus.CAPTURED) {
        const expired = await tx.manualPaymentSubmission.update({ where: { id: input.id }, data: { status: ManualPaymentSubmissionStatus.EXPIRED, reviewedAt: new Date(), reviewedByUserId: input.actor.id, rejectionReason: 'Payment was captured by another route.' } });
        return { item: expired, alreadyCaptured: true };
      }
      const claimedItem = await tx.manualPaymentSubmission.update({ where: { id: input.id }, data: { reviewedAt: new Date(), reviewedByUserId: input.actor.id } });
      return { item: claimedItem, alreadyCaptured: false };
    });
    if (claimed.alreadyCaptured) return { item: this.presentSubmission(claimed.item) };

    try {
      await this.markPaymentSucceeded.execute({
        paymentId: claimed.item.paymentId,
        providerEventRef: `manual-payment:${input.id}`,
        payload: { source: 'manual-review', submissionId: input.id },
        source: 'MANUAL_REVIEW',
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
      });
      const manualCaptureEvent = await this.prisma.paymentEvent.findFirst({
        where: {
          paymentId: claimed.item.paymentId,
          eventType: 'PAYMENT_CAPTURED',
          providerEventRef: `manual-payment:${input.id}`,
        },
        select: { id: true },
      });
      if (!manualCaptureEvent) {
        const expired = await this.prisma.manualPaymentSubmission.update({
          where: { id: input.id },
          data: {
            status: ManualPaymentSubmissionStatus.EXPIRED,
            reviewedAt: new Date(),
            reviewedByUserId: input.actor.id,
            rejectionReason: 'Payment was captured by another route.',
          },
        });
        return { item: this.presentSubmission(expired) };
      }
      const approved = await this.prisma.$transaction(async (tx) => {
        const item = await tx.manualPaymentSubmission.update({ where: { id: input.id }, data: { status: ManualPaymentSubmissionStatus.APPROVED, reviewedAt: new Date(), reviewedByUserId: input.actor.id, resubmitUntil: null } });
        await this.audit.recordRequired(tx, { action: 'MANUAL_PAYMENT_SUBMISSION_APPROVED', outcome: SecurityAuditOutcome.SUCCESS, actorType: SecurityAuditActorType.USER, actorUserId: input.actor.id, actorRoles: input.actor.roles, resourceType: 'ManualPaymentSubmission', resourceId: input.id, metadata: { paymentId: item.paymentId } });
        return item;
      });
      return { item: this.presentSubmission(approved) };
    } catch (error) {
      await this.prisma.manualPaymentSubmission.update({ where: { id: input.id }, data: { reviewedAt: null, reviewedByUserId: null } }).catch(() => undefined);
      throw error;
    }
  }

  async reject(input: { id: string; payload: RejectManualPaymentDto; actor: ManualActor }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const initial = await tx.manualPaymentSubmission.findUnique({ where: { id: input.id }, select: { paymentId: true } });
      if (!initial) throw new NotFoundException({ error: 'MANUAL_PAYMENT_SUBMISSION_NOT_FOUND' });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${initial.paymentId})::bigint)`;
      const current = await tx.manualPaymentSubmission.findUnique({ where: { id: input.id }, include: { payment: true } });
      if (!current) throw new NotFoundException({ error: 'MANUAL_PAYMENT_SUBMISSION_NOT_FOUND' });
      if (current.status !== ManualPaymentSubmissionStatus.UNDER_REVIEW || current.reviewedAt) throw new ConflictException({ error: 'MANUAL_PAYMENT_SUBMISSION_NOT_REVIEWABLE' });
      const enrollment = await tx.academyProgramEnrollment.findUnique({ where: { paymentId: current.paymentId }, include: { academyProgram: true } });
      const now = new Date();
      const candidate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const viability = enrollment?.academyProgram.endAt;
      const resubmitUntil = viability && viability < candidate ? viability : candidate;
      if (!enrollment || resubmitUntil <= now) throw new ConflictException({ error: 'MANUAL_PAYMENT_RESUBMIT_WINDOW_UNAVAILABLE' });
      const rejected = await tx.manualPaymentSubmission.update({ where: { id: input.id }, data: { status: ManualPaymentSubmissionStatus.REJECTED, reviewedAt: now, reviewedByUserId: input.actor.id, rejectionReason: input.payload.reason.trim(), resubmitUntil } });
      await tx.academyProgramEnrollment.update({ where: { id: enrollment.id }, data: { seatReservationExpiresAt: resubmitUntil } });
      await this.audit.recordRequired(tx, { action: 'MANUAL_PAYMENT_SUBMISSION_REJECTED', outcome: SecurityAuditOutcome.SUCCESS, actorType: SecurityAuditActorType.USER, actorUserId: input.actor.id, actorRoles: input.actor.roles, resourceType: 'ManualPaymentSubmission', resourceId: input.id, metadata: { paymentId: current.paymentId, resubmitUntil: resubmitUntil.toISOString() }, reason: input.payload.reason });
      return { item: rejected, patientUserId: enrollment.userId };
    });
    if (result.patientUserId) {
      await this.notifyPatientRejection(result.patientUserId, result.item.id, result.item.paymentId, result.item.rejectionReason ?? '');
    }
    return { item: this.presentSubmission(result.item) };
  }

  async resolveProof(id: string) {
    const item = await this.prisma.manualPaymentSubmission.findUnique({ where: { id }, select: { proofStoredFileId: true } });
    if (!item) throw new NotFoundException({ error: 'MANUAL_PAYMENT_SUBMISSION_NOT_FOUND' });
    const file = await this.storage.resolve(item.proofStoredFileId);
    if (!file || file.purpose !== StoredFilePurpose.MANUAL_PAYMENT_PROOF) throw new NotFoundException({ error: 'MANUAL_PAYMENT_PROOF_NOT_FOUND' });
    return file;
  }

  private async assertDomainEnabled(domain: string) {
    const domains = await this.configRuntime.getJson<string[]>(MANUAL_ENABLED_DOMAINS_KEY);
    if (!Array.isArray(domains) || !domains.includes(domain)) throw new BadRequestException({ error: 'MANUAL_PAYMENT_DOMAIN_DISABLED' });
  }

  private async notifyReviewers(submissionId: string, paymentId: string) {
    const reviewers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              in: [UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN, UserRoleType.FINANCE_STAFF],
            },
          },
        },
      },
      select: { id: true, defaultLocale: true },
    });
    await Promise.all(
      reviewers.map((reviewer) =>
        this.notificationWriter.createInAppNotification({
          slug: 'payments.manual-payment-review-required',
          userId: reviewer.id,
          locale: reviewer.defaultLocale === 'ar' ? 'ar' : 'en',
          title: reviewer.defaultLocale === 'ar' ? 'مراجعة دفعة يدوية' : 'Manual payment review required',
          body: reviewer.defaultLocale === 'ar' ? 'يوجد إثبات دفع يدوي جديد يحتاج إلى مراجعة.' : 'A manual payment proof is ready for review.',
          payload: {
            submissionId,
            paymentId,
            primaryAction: { kind: 'OPEN_MANUAL_PAYMENT_REVIEW', submissionId },
          },
          relatedEntityType: 'MANUAL_PAYMENT_SUBMISSION',
          relatedEntityId: submissionId,
          idempotencyKey: `payments.manual-payment-review-required:${submissionId}:${reviewer.id}`,
          category: NotificationCategory.PAYMENT,
        }),
      ),
    );
  }

  private async notifyPatientSubmission(userId: string, submissionId: string, paymentId: string) {
    const patient = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultLocale: true } });
    if (!patient) return;
    const locale = patient.defaultLocale === 'ar' ? 'ar' : 'en';
    await this.notificationWriter.createInAppNotification({
      slug: 'payments.manual-payment-submitted',
      userId,
      locale,
      title: locale === 'ar' ? 'تم استلام إثبات الدفع' : 'Payment proof received',
      body: locale === 'ar' ? 'إثبات الدفع اليدوي الخاص بك قيد المراجعة.' : 'Your manual payment proof is under review.',
      payload: { submissionId, paymentId },
      relatedEntityType: 'MANUAL_PAYMENT_SUBMISSION',
      relatedEntityId: submissionId,
      idempotencyKey: `payments.manual-payment-submitted:${submissionId}`,
      category: NotificationCategory.PAYMENT,
    });
  }

  private async notifyPatientRejection(userId: string, submissionId: string, paymentId: string, reason: string) {
    const patient = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultLocale: true } });
    if (!patient) return;
    const locale = patient.defaultLocale === 'ar' ? 'ar' : 'en';
    await this.notificationWriter.createInAppNotification({
      slug: 'payments.manual-payment-rejected',
      userId,
      locale,
      title: locale === 'ar' ? 'يحتاج إثبات الدفع إلى تعديل' : 'Payment proof needs changes',
      body: locale === 'ar' ? `تم رفض إثبات الدفع اليدوي. السبب: ${reason}` : `Your manual payment proof was rejected. Reason: ${reason}`,
      payload: { submissionId, paymentId, reason },
      relatedEntityType: 'MANUAL_PAYMENT_SUBMISSION',
      relatedEntityId: submissionId,
      idempotencyKey: `payments.manual-payment-rejected:${submissionId}`,
      category: NotificationCategory.PAYMENT,
    });
  }

  private async findAuthorizedEnrollment(id: string, token?: string, userId?: string) {
    const enrollment = await this.prisma.academyProgramEnrollment.findFirst({
      where: { id, ...(userId ? { userId } : token ? { publicAccessToken: token } : { id: '__unauthorized__' }) },
    });
    if (!enrollment) throw new ForbiddenException({ error: 'MANUAL_PAYMENT_ENROLLMENT_FORBIDDEN' });
    return enrollment;
  }

  private normalizeMethodPayload(payload: UpsertManualPaymentMethodDto) {
    const countries = (payload.countryIsoCodes ?? []).map((country) => country.trim().toUpperCase());
    if (payload.availabilityMode === ManualPaymentAvailabilityMode.SELECTED && countries.length === 0) {
      throw new BadRequestException({ error: 'MANUAL_PAYMENT_COUNTRIES_REQUIRED' });
    }
    return {
      code: payload.code.trim().toLowerCase(), type: payload.type,
      displayNameAr: payload.displayNameAr.trim(), displayNameEn: payload.displayNameEn.trim(),
      accountHolderName: payload.accountHolderName.trim(), accountIdentifier: payload.accountIdentifier.trim(),
      instructionsAr: payload.instructionsAr?.trim() || null, instructionsEn: payload.instructionsEn?.trim() || null,
      availabilityMode: payload.availabilityMode, countryIsoCodes: countries,
      sortOrder: payload.sortOrder ?? 0, isEnabled: payload.isEnabled ?? false,
    };
  }

  private normalizeCountry(country: string | null | undefined) {
    const normalized = country?.trim().toUpperCase();
    return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
  }

  private isManualPaymentSubmittableStatus(status: PaymentStatus) {
    return status === PaymentStatus.CREATED || status === PaymentStatus.PENDING;
  }

  private isEligible(method: { availabilityMode: ManualPaymentAvailabilityMode; countries: Array<{ countryIsoCode: string }> }, country: string | null) {
    return method.availabilityMode === ManualPaymentAvailabilityMode.ALL ||
      (!!country && method.countries.some((item) => item.countryIsoCode.toUpperCase() === country));
  }

  private presentMethod(method: any) {
    return {
      id: method.id, code: method.code, type: method.type,
      displayNameAr: method.displayNameAr, displayNameEn: method.displayNameEn,
      accountHolderName: method.accountHolderName, accountIdentifier: method.accountIdentifier,
      instructionsAr: method.instructionsAr, instructionsEn: method.instructionsEn,
      availabilityMode: method.availabilityMode, countryIsoCodes: method.countries?.map((item: any) => item.countryIsoCode) ?? [],
      isEnabled: method.isEnabled, sortOrder: method.sortOrder,
    };
  }

  private presentSubmission(submission: any) {
    return {
      id: submission.id, paymentId: submission.paymentId, methodId: submission.manualPaymentMethodId,
      attemptNumber: submission.attemptNumber, status: submission.status,
      senderAccountName: submission.senderAccountName, notes: submission.notes,
      submittedAt: submission.submittedAt, reviewedAt: submission.reviewedAt,
      rejectionReason: submission.rejectionReason, resubmitUntil: submission.resubmitUntil,
      amount: submission.paymentAmountSnapshot?.toString?.() ?? submission.paymentAmountSnapshot,
      currencyCode: submission.paymentCurrencySnapshot,
      method: submission.manualPaymentMethod ? this.presentMethod(submission.manualPaymentMethod) : {
        type: submission.methodTypeSnapshot, displayNameAr: submission.methodDisplayNameArSnapshot,
        displayNameEn: submission.methodDisplayNameEnSnapshot, accountHolderName: submission.accountHolderSnapshot,
        accountIdentifier: submission.accountIdentifierSnapshot, instructionsAr: submission.instructionsArSnapshot,
        instructionsEn: submission.instructionsEnSnapshot,
      },
      proofStoredFileId: submission.proofStoredFileId,
      paymentStatus: submission.payment?.status ?? null,
      payer: submission.payment?.academyProgramEnrollment?.user?.displayName ?? null,
      program: submission.payment?.academyProgramEnrollment?.academyProgram
        ? {
            titleAr: submission.payment.academyProgramEnrollment.academyProgram.titleAr,
            titleEn: submission.payment.academyProgramEnrollment.academyProgram.titleEn,
          }
        : null,
      enrollmentId: submission.payment?.academyProgramEnrollment?.id ?? null,
    };
  }
}
