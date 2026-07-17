import {
  AuthProvider,
  ConversationParticipantRole,
  ConversationStatus,
  ConversationType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PrismaClient,
  PractitionerSettlementStatus,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionStatus,
  SessionPaymentCoverageType,
  SettlementPayoutMethod,
  SettlementPayoutSource,
  SettlementBatchStatus,
  PackageSettlementStatus,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
  SupportTicketEventType,
  RefundDestination,
  RefundStatus,
  RefundType,
  UserRoleType,
  UserStatus,
  ChatApprovalStatus,
  PackageSchedulePolicy,
  PatientPackagePurchaseStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import {
  permissionDefinitions,
  rolePermissionBundles,
} from './modules/auth.seed';
import { seedCredentials, seedIds } from './shared/seed.constants';
import { daysAgo, daysFromNow, hashPassword } from './shared/seed.utils';

type QaAccount = {
  key: string;
  email: string;
  password: string;
  displayName: string;
  roles: UserRoleType[];
  status?: UserStatus;
  defaultLocale?: string;
  timezone?: string;
  createSession?: boolean;
};

type Summary = {
  usersEnsured: number;
  rolesEnsured: number;
  permissionsEnsured: number;
  sessionsEnsured: number;
  domainRecordsEnsured: number;
  skippedItems: string[];
};

function toStableUuid(seed: string): string {
  const hash = createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(
    13,
    16,
  )}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function assertSafeDatabaseUrl(): void {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const normalized = databaseUrl.toLowerCase();

  const isSafeLocalTarget =
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('fayed_db');

  if (!databaseUrl || !isSafeLocalTarget) {
    throw new Error(
      'Refusing to run QA seed unless DATABASE_URL points to the local fayed_db / localhost database.',
    );
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function ensurePermissionCatalog(prisma: PrismaClient): Promise<number> {
  let ensured = 0;

  for (const permission of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: {
        key: permission.key,
        description: permission.description,
      },
      update: {
        description: permission.description,
      },
    });
    ensured += 1;
  }

  return ensured;
}

async function ensureRoleBundles(prisma: PrismaClient): Promise<number> {
  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: permissionDefinitions.map((permission) => permission.key),
      },
    },
    select: {
      id: true,
      key: true,
    },
  });

  const permissionIdByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id]),
  );

  let ensured = 0;

  for (const bundle of rolePermissionBundles) {
    for (const permissionKey of bundle.permissions) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: bundle.role,
            permissionId,
          },
        },
        create: {
          role: bundle.role,
          permissionId,
        },
        update: {},
      });
      ensured += 1;
    }
  }

  return ensured;
}

async function ensureUserAccount(
  prisma: PrismaClient,
  account: QaAccount,
): Promise<{ userId: string; created: boolean }> {
  const email = normalizeEmail(account.email);
  const existingEmail = await prisma.userEmail.findUnique({
    where: { email },
    select: {
      userId: true,
    },
  });

  const userId = existingEmail?.userId ?? toStableUuid(`qa-user:${email}`);
  const created = !existingEmail;

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      displayName: account.displayName,
      status: account.status ?? UserStatus.ACTIVE,
      defaultLocale: account.defaultLocale ?? 'ar',
      timezone: account.timezone ?? 'Africa/Cairo',
    },
    update: {
      displayName: account.displayName,
      status: account.status ?? UserStatus.ACTIVE,
      defaultLocale: account.defaultLocale ?? 'ar',
      timezone: account.timezone ?? 'Africa/Cairo',
    },
  });

  await prisma.userEmail.upsert({
    where: { email },
    create: {
      userId,
      email,
      isPrimary: true,
      isVerified: true,
    },
    update: {
      userId,
      isPrimary: true,
      isVerified: true,
    },
  });

  await prisma.userEmail.updateMany({
    where: {
      userId,
      email: {
        not: email,
      },
    },
    data: {
      isPrimary: false,
    },
  });

  const passwordHash = await hashPassword(account.password);
  const existingIdentity = await prisma.authIdentity.findFirst({
    where: {
      userId,
      provider: AuthProvider.PASSWORD,
    },
    select: {
      id: true,
    },
  });

  if (existingIdentity) {
    await prisma.authIdentity.update({
      where: { id: existingIdentity.id },
      data: {
        passwordHash,
        isEnabled: true,
        lastUsedAt: null,
      },
    });
  } else {
    await prisma.authIdentity.create({
      data: {
        userId,
        provider: AuthProvider.PASSWORD,
        passwordHash,
        isEnabled: true,
      },
    });
  }

  for (const role of account.roles) {
    await prisma.userRole.upsert({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
      create: {
        userId,
        role,
      },
      update: {},
    });
  }

  if (account.createSession) {
    const sessionId = toStableUuid(`qa-session:${email}`);
    await prisma.userSession.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        userId,
        refreshTokenHash: `qa-refresh-${email}`,
        deviceId: `qa-device-${email}`,
        ipAddress: '127.0.0.1',
        userAgent: 'QA Seed',
        expiresAt: daysFromNow(30),
      },
      update: {
        revokedAt: null,
        expiresAt: daysFromNow(30),
      },
    });
  }

  return { userId, created };
}

async function ensureAdminPermissions(prisma: PrismaClient): Promise<void> {
  const targetEmail = 'qa.target.admin@hesba.local';
  const email = normalizeEmail(targetEmail);
  const existingEmail = await prisma.userEmail.findUnique({
    where: { email },
    select: { userId: true },
  });
  const userId = existingEmail?.userId ?? toStableUuid(`qa-user:${email}`);

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      displayName: 'QA Target Admin',
      status: UserStatus.ACTIVE,
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    },
    update: {
      displayName: 'QA Target Admin',
      status: UserStatus.ACTIVE,
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    },
  });

  await prisma.userEmail.upsert({
    where: { email },
    create: {
      userId,
      email,
      isPrimary: true,
      isVerified: true,
    },
    update: {
      userId,
      isPrimary: true,
      isVerified: true,
    },
  });

  const passwordHash = await hashPassword('TargetAdmin@12345');
  const existingIdentity = await prisma.authIdentity.findFirst({
    where: { userId, provider: AuthProvider.PASSWORD },
    select: { id: true },
  });

  if (existingIdentity) {
    await prisma.authIdentity.update({
      where: { id: existingIdentity.id },
      data: {
        passwordHash,
        isEnabled: true,
      },
    });
  } else {
    await prisma.authIdentity.create({
      data: {
        userId,
        provider: AuthProvider.PASSWORD,
        passwordHash,
        isEnabled: true,
      },
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId,
        role: UserRoleType.ADMIN,
      },
    },
    create: {
      userId,
      role: UserRoleType.ADMIN,
    },
    update: {},
  });

  const sessionId = toStableUuid(`qa-session:${email}`);
  await prisma.userSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId,
      refreshTokenHash: `qa-refresh-${email}`,
      deviceId: `qa-device-${email}`,
      ipAddress: '127.0.0.1',
      userAgent: 'QA Seed',
      expiresAt: daysFromNow(30),
    },
    update: {
      revokedAt: null,
      expiresAt: daysFromNow(30),
    },
  });

  const backupEmail = normalizeEmail('qa.super.admin.backup@hesba.local');
  const backupExisting = await prisma.userEmail.findUnique({
    where: { email: backupEmail },
    select: { userId: true },
  });
  const backupUserId =
    backupExisting?.userId ?? toStableUuid(`qa-user:${backupEmail}`);

  await prisma.user.upsert({
    where: { id: backupUserId },
    create: {
      id: backupUserId,
      displayName: 'QA Backup Super Admin',
      status: UserStatus.ACTIVE,
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    },
    update: {
      displayName: 'QA Backup Super Admin',
      status: UserStatus.ACTIVE,
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    },
  });

  await prisma.userEmail.upsert({
    where: { email: backupEmail },
    create: {
      userId: backupUserId,
      email: backupEmail,
      isPrimary: true,
      isVerified: true,
    },
    update: {
      userId: backupUserId,
      isPrimary: true,
      isVerified: true,
    },
  });

  const backupHash = await hashPassword('BackupSuper@12345');
  const backupIdentity = await prisma.authIdentity.findFirst({
    where: { userId: backupUserId, provider: AuthProvider.PASSWORD },
    select: { id: true },
  });

  if (backupIdentity) {
    await prisma.authIdentity.update({
      where: { id: backupIdentity.id },
      data: {
        passwordHash: backupHash,
        isEnabled: true,
      },
    });
  } else {
    await prisma.authIdentity.create({
      data: {
        userId: backupUserId,
        provider: AuthProvider.PASSWORD,
        passwordHash: backupHash,
        isEnabled: true,
      },
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: backupUserId,
        role: UserRoleType.SUPER_ADMIN,
      },
    },
    create: {
      userId: backupUserId,
      role: UserRoleType.SUPER_ADMIN,
    },
    update: {},
  });

  await prisma.userSession.upsert({
    where: { id: toStableUuid(`qa-session:${backupEmail}`) },
    create: {
      id: toStableUuid(`qa-session:${backupEmail}`),
      userId: backupUserId,
      refreshTokenHash: `qa-refresh-${backupEmail}`,
      deviceId: `qa-device-${backupEmail}`,
      ipAddress: '127.0.0.1',
      userAgent: 'QA Seed',
      expiresAt: daysFromNow(30),
    },
    update: {
      revokedAt: null,
      expiresAt: daysFromNow(30),
    },
  });
}

async function ensureOperationalAccounts(prisma: PrismaClient): Promise<void> {
  const accounts: QaAccount[] = [
    {
      key: 'superAdmin',
      email: seedCredentials.superAdmin.email,
      password: seedCredentials.superAdmin.password,
      displayName: 'QA Super Admin',
      roles: [UserRoleType.SUPER_ADMIN],
      createSession: true,
    },
    {
      key: 'admin',
      email: 'qa.admin@hesba.local',
      password: 'AdminQa@12345',
      displayName: 'QA Admin',
      roles: [UserRoleType.ADMIN],
      createSession: true,
    },
    {
      key: 'support',
      email: seedCredentials.support.email,
      password: seedCredentials.support.password,
      displayName: 'QA Support Agent',
      roles: [UserRoleType.SUPPORT],
      createSession: true,
    },
    {
      key: 'contentReviewer',
      email: seedCredentials.reviewer.email,
      password: seedCredentials.reviewer.password,
      displayName: 'QA Content Reviewer',
      roles: [UserRoleType.CONTENT_REVIEWER],
      createSession: true,
    },
    {
      key: 'finance',
      email: 'finance@hesba.local',
      password: 'Finance@12345',
      displayName: 'QA Finance Staff',
      roles: [UserRoleType.FINANCE_STAFF],
      createSession: true,
    },
    {
      key: 'practitionerReviewer',
      email: 'practitioner.reviewer@hesba.local',
      password: 'ReviewerQa@12345',
      displayName: 'QA Practitioner Reviewer',
      roles: [UserRoleType.PRACTITIONER_REVIEWER],
      createSession: true,
    },
    {
      key: 'patientOperations',
      email: 'patient.ops@hesba.local',
      password: 'PatientOps@12345',
      displayName: 'QA Patient Operations',
      roles: [UserRoleType.PATIENT_OPERATIONS],
      createSession: true,
    },
    {
      key: 'marketing',
      email: 'marketing@hesba.local',
      password: 'Marketing@12345',
      displayName: 'QA Marketing Staff',
      roles: [UserRoleType.MARKETING_STAFF],
      createSession: true,
    },
    {
      key: 'patientA',
      email: seedCredentials.patientA.email,
      password: seedCredentials.patientA.password,
      displayName: 'QA Test Patient A',
      roles: [UserRoleType.PATIENT],
      createSession: true,
    },
    {
      key: 'patientB',
      email: seedCredentials.patientB.email,
      password: 'Patient2@12345',
      displayName: 'QA Test Patient B',
      roles: [UserRoleType.PATIENT],
      createSession: true,
    },
    {
      key: 'patientC',
      email: seedCredentials.patientC.email,
      password: seedCredentials.patientC.password,
      displayName: 'QA Test Patient C',
      roles: [UserRoleType.PATIENT],
      createSession: true,
    },
    {
      key: 'practitionerA',
      email: seedCredentials.practitionerA.email,
      password: seedCredentials.practitionerA.password,
      displayName: 'QA Test Practitioner A',
      roles: [UserRoleType.PRACTITIONER],
      createSession: true,
    },
    {
      key: 'practitionerB',
      email: seedCredentials.practitionerB.email,
      password: seedCredentials.practitionerB.password,
      displayName: 'QA Test Practitioner B',
      roles: [UserRoleType.PRACTITIONER],
      createSession: true,
    },
  ];

  for (const account of accounts) {
    await ensureUserAccount(prisma, account);
  }
}

async function ensureSupportData(prisma: PrismaClient): Promise<boolean> {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: seedIds.users.patientA },
    select: { id: true },
  });
  const practitionerProfile = await prisma.practitionerProfile.findUnique({
    where: { userId: seedIds.users.practitionerF },
    select: { id: true },
  });

  if (!patientProfile || !practitionerProfile) {
    return false;
  }

  const conversationRef = 'qa-support-conversation-001';
  const supportTicketRef = 'QA-SUPPORT-001';
  const existingConversation = await prisma.conversation.findFirst({
    where: { conversationRef },
    select: { id: true },
  });
  const conversationId =
    existingConversation?.id ?? toStableUuid('qa-support-conversation-001');
  const existingTicket = await prisma.supportTicket.findFirst({
    where: { publicTicketRef: supportTicketRef },
    select: { id: true },
  });
  const supportTicketId =
    existingTicket?.id ?? toStableUuid('qa-support-ticket-001');

  await prisma.conversation.upsert({
    where: { id: conversationId },
    create: {
      id: conversationId,
      conversationType: ConversationType.SUPPORT,
      status: ConversationStatus.OPEN,
      patientId: patientProfile.id,
      practitionerId: null,
      supportTicketId: null,
      sessionId: null,
      conversationRef,
    },
    update: {
      patientId: patientProfile.id,
      status: ConversationStatus.OPEN,
    },
  });

  await prisma.supportTicket.upsert({
    where: { id: supportTicketId },
    create: {
      id: supportTicketId,
      openedByUserId: seedIds.users.patientA,
      createdByRole: ConversationParticipantRole.PATIENT,
      patientId: patientProfile.id,
      practitionerId: null,
      conversationId,
      ticketType: SupportTicketType.GENERAL,
      status: SupportTicketStatus.OPEN,
      priority: SupportTicketPriority.MEDIUM,
      subject: 'QA Support Ticket',
      description: 'Sandbox support ticket for TestSprite QA.',
      publicTicketRef: supportTicketRef,
      lastMessageAt: new Date(),
    },
    update: {
      patientId: patientProfile.id,
      status: SupportTicketStatus.OPEN,
      priority: SupportTicketPriority.MEDIUM,
      subject: 'QA Support Ticket',
      description: 'Sandbox support ticket for TestSprite QA.',
      lastMessageAt: new Date(),
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      supportTicketId,
    },
  });

  await prisma.supportTicketEvent.upsert({
    where: {
      id: toStableUuid('qa-support-ticket-event-001'),
    },
    create: {
      id: toStableUuid('qa-support-ticket-event-001'),
      supportTicketId,
      eventType: SupportTicketEventType.TICKET_CREATED,
      actorUserId: seedIds.users.patientA,
      actorRole: ConversationParticipantRole.PATIENT,
      payloadJson: {
        qa: true,
        source: 'testsprite-seed',
      },
    },
    update: {
      payloadJson: {
        qa: true,
        source: 'testsprite-seed',
      },
    },
  });

  const careConversationRef = 'qa-care-chat-conversation-001';
  const careApprovalRef = 'QA-CARE-001';
  const existingCareConversation = await prisma.conversation.findFirst({
    where: { conversationRef: careConversationRef },
    select: { id: true },
  });
  const careConversationId =
    existingCareConversation?.id ?? toStableUuid('qa-care-chat-conversation-001');
  const existingCareRequest = await prisma.chatApprovalRequest.findFirst({
    where: { approvalRef: careApprovalRef },
    select: { id: true },
  });
  const careRequestId =
    existingCareRequest?.id ?? toStableUuid('qa-care-chat-request-001');

  await prisma.conversation.upsert({
    where: { id: careConversationId },
    create: {
      id: careConversationId,
      conversationType: ConversationType.CARE_APPROVED,
      status: ConversationStatus.OPEN,
      patientId: patientProfile.id,
      practitionerId: practitionerProfile.id,
      supportTicketId: null,
      sessionId: null,
      conversationRef: careConversationRef,
    },
    update: {
      patientId: patientProfile.id,
      practitionerId: practitionerProfile.id,
      status: ConversationStatus.OPEN,
    },
  });

  await prisma.chatApprovalRequest.upsert({
    where: { id: careRequestId },
    create: {
      id: careRequestId,
      patientId: patientProfile.id,
      practitionerId: practitionerProfile.id,
      requestedByUserId: seedIds.users.patientA,
      linkedConversationId: careConversationId,
      status: ChatApprovalStatus.PENDING,
      requestReason: 'QA care-chat approval request for TestSprite.',
      approvalRef: careApprovalRef,
      requestedAt: new Date(),
      expiresAt: daysFromNow(7),
    },
    update: {
      linkedConversationId: careConversationId,
      status: ChatApprovalStatus.PENDING,
      requestReason: 'QA care-chat approval request for TestSprite.',
      expiresAt: daysFromNow(7),
    },
  });

  return true;
}

async function ensureSessionPaymentData(prisma: PrismaClient): Promise<boolean> {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: seedIds.users.patientA },
    select: { id: true },
  });
  const practitionerProfile = await prisma.practitionerProfile.findUnique({
    where: { userId: seedIds.users.practitionerF },
    select: { id: true },
  });

  if (!patientProfile || !practitionerProfile) {
    return false;
  }

  const sessionCode = 'QA-SESSION-001';
  const existingSession = await prisma.session.findUnique({
    where: { sessionCode },
    select: { id: true },
  });
  const sessionId = existingSession?.id ?? toStableUuid('qa-session-001');
  const sessionStartAt = daysFromNow(2);
  const sessionEndAt = new Date(sessionStartAt.getTime() + 60 * 60 * 1000);

  await prisma.session.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      sessionCode,
      patientId: patientProfile.id,
      practitionerId: practitionerProfile.id,
      flowType: SessionFlowType.SCHEDULED,
      sessionMode: SessionMode.VIDEO,
      durationMinutes: 60,
      status: SessionStatus.CONFIRMED,
      requestedStartAt: sessionStartAt,
      scheduledStartAt: sessionStartAt,
      scheduledEndAt: sessionEndAt,
      joinOpenAt: null,
      expiresAt: daysFromNow(3),
      provider: SessionProvider.NONE,
      paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      notesInternal: 'QA session for TestSprite.',
    },
    update: {
      sessionCode,
      status: SessionStatus.CONFIRMED,
      scheduledStartAt: sessionStartAt,
      scheduledEndAt: sessionEndAt,
      expiresAt: daysFromNow(3),
      notesInternal: 'QA session for TestSprite.',
    },
  });

  const paymentId = toStableUuid('qa-payment-001');
  await prisma.payment.upsert({
    where: { id: paymentId },
    create: {
      id: paymentId,
      sessionId,
      patientId: patientProfile.id,
      practitionerId: practitionerProfile.id,
      paymentPurpose: PaymentPurpose.SESSION_BOOKING,
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.CAPTURED,
      amountSubtotal: 300,
      amountDiscount: 0,
      amountTotal: 300,
      amountFromWallet: 0,
      amountFromGateway: 300,
      currencyCode: 'EGP',
      providerPaymentRef: 'qa-pay-ref-001',
      providerOrderRef: 'qa-order-ref-001',
      providerCustomerRef: 'qa-customer-ref-001',
      capturedAt: new Date(),
      metadataJson: {
        qa: true,
        source: 'testsprite-seed',
      },
    },
    update: {
      sessionId,
      status: PaymentStatus.CAPTURED,
      amountSubtotal: 300,
      amountTotal: 300,
      amountFromGateway: 300,
      currencyCode: 'EGP',
      providerPaymentRef: 'qa-pay-ref-001',
      providerOrderRef: 'qa-order-ref-001',
      providerCustomerRef: 'qa-customer-ref-001',
      capturedAt: new Date(),
      metadataJson: {
        qa: true,
        source: 'testsprite-seed',
      },
    },
  });

  await prisma.refund.upsert({
    where: { id: toStableUuid('qa-refund-001') },
    create: {
      id: toStableUuid('qa-refund-001'),
      paymentId,
      sessionId,
      refundType: RefundType.FULL,
      status: RefundStatus.REQUESTED,
      destination: RefundDestination.ORIGINAL_METHOD,
      refundReason: 'QA sandbox refund candidate for TestSprite.',
      amount: 300,
      currencyCode: 'EGP',
      metadataJson: {
        qa: true,
        source: 'testsprite-seed',
      },
    },
    update: {
      sessionId,
      status: RefundStatus.REQUESTED,
      refundReason: 'QA sandbox refund candidate for TestSprite.',
      amount: 300,
      currencyCode: 'EGP',
      metadataJson: {
        qa: true,
        source: 'testsprite-seed',
      },
    },
  });

  const existingBatch = await prisma.settlementBatch.findFirst({
    where: {
      periodYear: new Date().getUTCFullYear(),
      periodMonth: new Date().getUTCMonth() + 1,
      currencyCode: 'EGP',
    },
    select: { id: true },
  });
  const batchId = existingBatch?.id ?? toStableUuid('qa-settlement-batch-001');
  const existingSettlement = await prisma.practitionerSettlement.findFirst({
    where: {
      batchId,
      practitionerId: practitionerProfile.id,
    },
    select: { id: true },
  });
  const settlementId =
    existingSettlement?.id ?? toStableUuid('qa-practitioner-settlement-001');
  await prisma.settlementBatch.upsert({
    where: { id: batchId },
    create: {
      id: batchId,
      periodYear: new Date().getUTCFullYear(),
      periodMonth: new Date().getUTCMonth() + 1,
      currencyCode: 'EGP',
      status: SettlementBatchStatus.GENERATED,
      slug: 'qa-settlement-batch-egp',
      generatedAt: new Date(),
    },
    update: {
      slug: 'qa-settlement-batch-egp',
      status: SettlementBatchStatus.GENERATED,
      generatedAt: new Date(),
    },
  });

  await prisma.practitionerSettlement.upsert({
    where: { id: settlementId },
    create: {
      id: settlementId,
      batchId,
      practitionerId: practitionerProfile.id,
      walletId: null,
      amountGross: 1000,
      amountAdjustments: 0,
      amountNet: 900,
      amountPaidTotal: 0,
      currencyCode: 'EGP',
      status: PractitionerSettlementStatus.READY,
      notes: 'QA settlement ready for TestSprite.',
    },
    update: {
      batchId,
      practitionerId: practitionerProfile.id,
      amountGross: 1000,
      amountNet: 900,
      currencyCode: 'EGP',
      status: PractitionerSettlementStatus.READY,
      notes: 'QA settlement ready for TestSprite.',
    },
  });

  await prisma.practitionerSettlementPayout.upsert({
    where: { id: toStableUuid('qa-practitioner-payout-001') },
    create: {
      id: toStableUuid('qa-practitioner-payout-001'),
      batchId,
      settlementId,
      practitionerId: practitionerProfile.id,
      amountPaid: 900,
      currencyCode: 'EGP',
      payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
      payoutSource: SettlementPayoutSource.BATCH_CLOSEOUT,
      payoutMethodSnapshot: {
        qa: true,
        source: 'testsprite-seed',
      },
      transferFeeAmount: 0,
      effectiveAt: new Date(),
      processedByUserId: seedIds.users.superAdmin,
      notes: 'QA payout for TestSprite.',
    },
    update: {
      amountPaid: 900,
      currencyCode: 'EGP',
      effectiveAt: new Date(),
      processedByUserId: seedIds.users.superAdmin,
      notes: 'QA payout for TestSprite.',
    },
  });

  const packagePlan = await prisma.packagePlan.findFirst({
    where: { code: 'SESSIONS_6' },
    select: {
      id: true,
      code: true,
      sessionCount: true,
      discountPercent: true,
      title: true,
      description: true,
    },
  });

  if (packagePlan) {
    const packagePaymentId = toStableUuid('qa-package-payment-001');
    await prisma.payment.upsert({
      where: { id: packagePaymentId },
      create: {
        id: packagePaymentId,
        patientId: patientProfile.id,
        practitionerId: practitionerProfile.id,
        paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 1200,
        amountDiscount: 180,
        amountTotal: 1020,
        amountFromWallet: 0,
        amountFromGateway: 1020,
        currencyCode: 'EGP',
        providerPaymentRef: 'qa-package-pay-ref-001',
        providerOrderRef: 'qa-package-order-ref-001',
        providerCustomerRef: 'qa-package-customer-ref-001',
        capturedAt: new Date(),
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
          kind: 'package-purchase',
        },
      },
      update: {
        patientId: patientProfile.id,
        practitionerId: practitionerProfile.id,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 1200,
        amountDiscount: 180,
        amountTotal: 1020,
        amountFromGateway: 1020,
        currencyCode: 'EGP',
        providerPaymentRef: 'qa-package-pay-ref-001',
        providerOrderRef: 'qa-package-order-ref-001',
        providerCustomerRef: 'qa-package-customer-ref-001',
        capturedAt: new Date(),
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
          kind: 'package-purchase',
        },
      },
    });

    const packagePurchaseId = toStableUuid('qa-package-purchase-001');
    await prisma.patientPackagePurchase.upsert({
      where: { paymentId: packagePaymentId },
      create: {
        id: packagePurchaseId,
        packagePlanId: packagePlan.id,
        practitionerId: practitionerProfile.id,
        patientId: patientProfile.id,
        paymentId: packagePaymentId,
        status: PatientPackagePurchaseStatus.ACTIVE,
        paymentInitiatedAt: new Date(),
        paidAt: new Date(),
        activatedAt: new Date(),
        titleSnapshot: packagePlan.title,
        descriptionSnapshot: packagePlan.description,
        slugSnapshot: packagePlan.code,
        packageVersionSnapshot: 1,
        planIdSnapshot: packagePlan.id,
        planCodeSnapshot: packagePlan.code,
        sessionCountSnapshot: packagePlan.sessionCount,
        discountPercentSnapshot: packagePlan.discountPercent,
        baseSessionPriceEgpSnapshot: 200,
        baseSessionPriceUsdSnapshot: 12,
        currencyCodeSnapshot: 'EGP',
        selectedBaseSessionPriceSnapshot: 200,
        undiscountedTotalSnapshot: 1200,
        discountAmountSnapshot: 180,
        patientPayableTotalSnapshot: 1020,
        platformDiscountShareSnapshot: 90,
        practitionerDiscountShareSnapshot: 90,
        commissionModeSnapshot: 'STANDARD',
        platformOriginalShareSnapshot: 600,
        practitionerOriginalShareSnapshot: 420,
        platformFinalShareSnapshot: 510,
        practitionerFinalShareSnapshot: 510,
        sessionDurationMinutesSnapshot: 60,
        sessionModeSnapshot: SessionMode.VIDEO,
        schedulePolicySnapshot: PackageSchedulePolicy.ALLOW_SCHEDULE_LATER,
        priceEgpSnapshot: 1200,
        priceUsdSnapshot: 75,
        selectedCurrencyCode: 'EGP',
        selectedAmountSnapshot: 1020,
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
        },
      },
      update: {
        packagePlanId: packagePlan.id,
        practitionerId: practitionerProfile.id,
        patientId: patientProfile.id,
        status: PatientPackagePurchaseStatus.ACTIVE,
        paymentInitiatedAt: new Date(),
        paidAt: new Date(),
        activatedAt: new Date(),
        titleSnapshot: packagePlan.title,
        descriptionSnapshot: packagePlan.description,
        slugSnapshot: packagePlan.code,
        packageVersionSnapshot: 1,
        planIdSnapshot: packagePlan.id,
        planCodeSnapshot: packagePlan.code,
        sessionCountSnapshot: packagePlan.sessionCount,
        discountPercentSnapshot: packagePlan.discountPercent,
        baseSessionPriceEgpSnapshot: 200,
        baseSessionPriceUsdSnapshot: 12,
        currencyCodeSnapshot: 'EGP',
        selectedBaseSessionPriceSnapshot: 200,
        undiscountedTotalSnapshot: 1200,
        discountAmountSnapshot: 180,
        patientPayableTotalSnapshot: 1020,
        platformDiscountShareSnapshot: 90,
        practitionerDiscountShareSnapshot: 90,
        commissionModeSnapshot: 'STANDARD',
        platformOriginalShareSnapshot: 600,
        practitionerOriginalShareSnapshot: 420,
        platformFinalShareSnapshot: 510,
        practitionerFinalShareSnapshot: 510,
        sessionDurationMinutesSnapshot: 60,
        sessionModeSnapshot: SessionMode.VIDEO,
        schedulePolicySnapshot: PackageSchedulePolicy.ALLOW_SCHEDULE_LATER,
        priceEgpSnapshot: 1200,
        priceUsdSnapshot: 75,
        selectedCurrencyCode: 'EGP',
        selectedAmountSnapshot: 1020,
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
        },
      },
    });

    await prisma.packageSettlement.upsert({
      where: { purchaseId: packagePurchaseId },
      create: {
        id: toStableUuid('qa-package-settlement-001'),
        purchaseId: packagePurchaseId,
        practitionerId: practitionerProfile.id,
        patientId: patientProfile.id,
        currencyCode: 'EGP',
        status: PackageSettlementStatus.READY_TO_RELEASE,
        sessionCount: packagePlan.sessionCount,
        completedSessionsCount: packagePlan.sessionCount,
        heldPractitionerAmount: 510,
        heldPlatformAmount: 510,
        releasablePractitionerAmount: 510,
        releasedPractitionerAmount: 0,
        normalEquivalentUsedAmount: 0,
        discountAppliedAmount: 180,
        decision: 'QA ready-to-release package settlement',
        notes: 'QA package settlement for TestSprite.',
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
        },
      },
      update: {
        practitionerId: practitionerProfile.id,
        patientId: patientProfile.id,
        currencyCode: 'EGP',
        status: PackageSettlementStatus.READY_TO_RELEASE,
        sessionCount: packagePlan.sessionCount,
        completedSessionsCount: packagePlan.sessionCount,
        heldPractitionerAmount: 510,
        heldPlatformAmount: 510,
        releasablePractitionerAmount: 510,
        releasedPractitionerAmount: 0,
        normalEquivalentUsedAmount: 0,
        discountAppliedAmount: 180,
        decision: 'QA ready-to-release package settlement',
        notes: 'QA package settlement for TestSprite.',
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
        },
      },
    });
  } else {
    console.log('[qa.testsprite.seed] package plan SESSIONS_6 not found; skipping package settlement data.');
  }

  return true;
}

async function ensureReviewAcceptanceData(prisma: PrismaClient): Promise<boolean> {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: seedIds.users.patientA },
    select: { id: true },
  });
  const practitionerProfile = await prisma.practitionerProfile.findUnique({
    where: { userId: seedIds.users.practitionerF },
    select: { id: true },
  });

  if (!patientProfile || !practitionerProfile) {
    return false;
  }

  const reviewSessions = [
    {
      seedKey: 'qa-review-acceptance-f-text',
      sessionCode: 'QA-REVIEW-ACCEPT-F-001',
      sessionDate: daysAgo(4),
      roomSuffix: 'f-text',
    },
    {
      seedKey: 'qa-review-acceptance-f-rating-only',
      sessionCode: 'QA-REVIEW-ACCEPT-F-002',
      sessionDate: daysAgo(3),
      roomSuffix: 'f-rating-only',
    },
    {
      seedKey: 'qa-review-acceptance-f-rating-only-2',
      sessionCode: 'QA-REVIEW-ACCEPT-F-003',
      sessionDate: daysAgo(2),
      roomSuffix: 'f-rating-only-2',
    },
  ];

  for (const reviewSession of reviewSessions) {
    const endAt = new Date(reviewSession.sessionDate.getTime() + 60 * 60 * 1000);
    const sessionId = toStableUuid(reviewSession.seedKey);
    const paymentId = toStableUuid(`${reviewSession.seedKey}-payment`);

    await prisma.session.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        sessionCode: reviewSession.sessionCode,
        patientId: patientProfile.id,
        practitionerId: practitionerProfile.id,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.COMPLETED,
        requestedStartAt: reviewSession.sessionDate,
        scheduledStartAt: reviewSession.sessionDate,
        scheduledEndAt: endAt,
        joinOpenAt: new Date(reviewSession.sessionDate.getTime() - 10 * 60 * 1000),
        expiresAt: null,
        cancelledAt: null,
        completedAt: endAt,
        provider: SessionProvider.DAILY,
        providerRoomId: `qa-review-room-${reviewSession.roomSuffix}`,
        providerSessionRef: `qa-review-provider-${reviewSession.roomSuffix}`,
        timezoneSnapshot: 'Africa/Cairo',
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
        notesInternal: 'QA review acceptance session for TestSprite.',
      },
      update: {
        sessionCode: reviewSession.sessionCode,
        patientId: patientProfile.id,
        practitionerId: practitionerProfile.id,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.COMPLETED,
        requestedStartAt: reviewSession.sessionDate,
        scheduledStartAt: reviewSession.sessionDate,
        scheduledEndAt: endAt,
        joinOpenAt: new Date(reviewSession.sessionDate.getTime() - 10 * 60 * 1000),
        expiresAt: null,
        cancelledAt: null,
        completedAt: endAt,
        provider: SessionProvider.DAILY,
        providerRoomId: `qa-review-room-${reviewSession.roomSuffix}`,
        providerSessionRef: `qa-review-provider-${reviewSession.roomSuffix}`,
        timezoneSnapshot: 'Africa/Cairo',
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
        notesInternal: 'QA review acceptance session for TestSprite.',
      },
    });

    await prisma.payment.upsert({
      where: { id: paymentId },
      create: {
        id: paymentId,
        sessionId,
        patientId: patientProfile.id,
        practitionerId: practitionerProfile.id,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 300,
        amountDiscount: 0,
        amountTotal: 300,
        amountFromWallet: 0,
        amountFromGateway: 300,
        currencyCode: 'EGP',
        providerPaymentRef: `qa-review-payment-ref-${reviewSession.roomSuffix}`,
        providerOrderRef: `qa-review-order-ref-${reviewSession.roomSuffix}`,
        providerCustomerRef: `qa-review-customer-ref-${reviewSession.roomSuffix}`,
        capturedAt: endAt,
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
          kind: 'review-acceptance',
          reviewVariant: reviewSession.seedKey,
        },
      },
      update: {
        sessionId,
        patientId: patientProfile.id,
        practitionerId: practitionerProfile.id,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 300,
        amountDiscount: 0,
        amountTotal: 300,
        amountFromGateway: 300,
        currencyCode: 'EGP',
        providerPaymentRef: `qa-review-payment-ref-${reviewSession.roomSuffix}`,
        providerOrderRef: `qa-review-order-ref-${reviewSession.roomSuffix}`,
        providerCustomerRef: `qa-review-customer-ref-${reviewSession.roomSuffix}`,
        capturedAt: endAt,
        metadataJson: {
          qa: true,
          source: 'testsprite-seed',
          kind: 'review-acceptance',
          reviewVariant: reviewSession.seedKey,
        },
      },
    });
  }

  return true;
}

async function main(): Promise<void> {
  assertSafeDatabaseUrl();

  const prisma = new PrismaClient();
  const summary: Summary = {
    usersEnsured: 0,
    rolesEnsured: 0,
    permissionsEnsured: 0,
    sessionsEnsured: 0,
    domainRecordsEnsured: 0,
    skippedItems: [],
  };

  try {
    summary.permissionsEnsured = await ensurePermissionCatalog(prisma);
    summary.rolesEnsured = await ensureRoleBundles(prisma);

    await ensureAdminPermissions(prisma);
    await ensureOperationalAccounts(prisma);
    summary.usersEnsured = 15;
    summary.sessionsEnsured = 15;

    const supportReady = await ensureSupportData(prisma);
    if (supportReady) {
      summary.domainRecordsEnsured += 3;
    } else {
      summary.skippedItems.push(
        'Support ticket / care chat skipped because patient or practitioner profile prerequisites were missing.',
      );
    }

    const financeReady = await ensureSessionPaymentData(prisma);
    if (financeReady) {
      summary.domainRecordsEnsured += 10;
    } else {
      summary.skippedItems.push(
        'Session/payment/refund/settlement QA data skipped because patient or practitioner profile prerequisites were missing.',
      );
    }

    const reviewReady = await ensureReviewAcceptanceData(prisma);
    if (reviewReady) {
      summary.domainRecordsEnsured += 4;
    } else {
      summary.skippedItems.push(
        'Review acceptance QA data skipped because patient or practitioner profile prerequisites were missing.',
      );
    }

    console.log('QA TestSprite seed completed successfully.');
    console.log(
      JSON.stringify(
        {
          usersEnsured: summary.usersEnsured,
          rolesEnsured: summary.rolesEnsured,
          permissionsEnsured: summary.permissionsEnsured,
          sessionsEnsured: summary.sessionsEnsured,
          domainRecordsEnsured: summary.domainRecordsEnsured,
          skippedItems: summary.skippedItems,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('QA TestSprite seed failed:', error);
  process.exit(1);
});
