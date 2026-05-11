import {
  AuthProvider,
  OtpChannel,
  PrismaClient,
  UserRoleType,
} from '@prisma/client';
import { seedCredentials, seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysFromNow, hashPassword } from '../shared/seed.utils';

/**
 * Auth seed module owns identities, two-factor preferences, and sample sessions.
 * This keeps authentication-related seed records isolated from user/profile domain seeds.
 */

export const permissionDefinitions: Array<{
  key: string;
  description: string;
}> = [
  {
    key: 'finance.events.read',
    description: 'Read finance operation events and diagnostics',
  },
  {
    key: 'finance.accounting.read',
    description:
      'Read accounting dashboard, ledger explorer, reconciliation overview and items',
  },
  {
    key: 'finance.accounting.write',
    description: 'Mutate accounting reconciliation review decisions',
  },
  {
    key: 'settlements.read',
    description: 'Read settlement batches, dues, and payout views',
  },
  {
    key: 'settlements.write',
    description: 'Mutate settlement state and record settlement payouts',
  },
  {
    key: 'practitioner-payouts.read',
    description: 'Read practitioner payout dues/history/details/proofs',
  },
  {
    key: 'practitioner-payouts.write',
    description: 'Create practitioner payouts and upload payout proofs',
  },
  {
    key: 'practitioner-statements.read',
    description: 'Read and export practitioner statement timelines',
  },
  {
    key: 'notification-ops.read',
    description: 'Read notification operations diagnostics',
  },
  {
    key: 'audit-log.read',
    description: 'Read administrative audit timeline and details',
  },
  {
    key: 'refunds.approve',
    description: 'Create and approve payment refund requests',
  },
  {
    key: 'refunds.retry',
    description: 'Retry failed payment refund requests',
  },
  {
    key: 'sessions.read.admin',
    description: 'Read session operational data in admin context',
  },
  {
    key: 'sessions.read.supportSummary',
    // RESERVED: This permission is intentionally seeded but no dedicated endpoint exists yet.
    // SUPPORT_AGENT is blocked from full admin session details (sessions.read.admin).
    // When a support-safe session summary endpoint is built, it must:
    //   - Require this permission (NOT sessions.read.admin)
    //   - Return only: id, status, scheduledStartAt/End, paymentStatus summary, cancellationState
    //   - Exclude: messages, notes, assessment results, clinical details, provider tokens, full ledger
    description:
      'Read minimal support-safe session summary for customer support operations',
  },
  {
    key: 'careChat.request.decide',
    description: 'Approve, reject, or revoke care chat requests',
  },
  {
    key: 'careChat.request.read.admin',
    description: 'Read care-chat approval requests in admin/support context',
  },
  {
    key: 'careChat.conversation.read.admin',
    description: 'Read care-chat conversation threads in admin/support context',
  },
  {
    key: 'patients.read.admin',
    description: 'Read patient profile list and basic details in back-office',
  },
  {
    key: 'patients.sensitive.read',
    description: 'Read sensitive patient data such as assessment submissions',
  },
  {
    key: 'support.ticket.note.internal',
    description:
      'Add internal notes to support tickets (admin-only; not visible to reporters)',
  },
  {
    key: 'support.ticket.assign',
    description: 'Assign or reassign support tickets to admin/support users',
  },
];

export const rolePermissionBundles: Array<{
  role: UserRoleType;
  permissions: string[];
}> = [
  {
    role: UserRoleType.SUPER_ADMIN,
    permissions: permissionDefinitions.map((permission) => permission.key),
  },
  {
    role: UserRoleType.ADMIN,
    permissions: permissionDefinitions.map((permission) => permission.key),
  },
  {
    role: UserRoleType.FINANCE_STAFF,
    permissions: [
      'finance.events.read',
      'finance.accounting.read',
      'finance.accounting.write',
      'settlements.read',
      'settlements.write',
      'practitioner-payouts.read',
      'practitioner-payouts.write',
      'practitioner-statements.read',
      'refunds.approve',
      'refunds.retry',
    ],
  },
  {
    role: UserRoleType.MARKETING_STAFF,
    permissions: ['notification-ops.read'],
  },
  {
    role: UserRoleType.PRACTITIONER_REVIEWER,
    permissions: ['audit-log.read'],
  },
  {
    role: UserRoleType.PATIENT_OPERATIONS,
    permissions: [
      'notification-ops.read',
      'audit-log.read',
      'sessions.read.admin',
      'patients.read.admin',
    ],
  },
  {
    role: UserRoleType.CONTENT_REVIEWER,
    permissions: ['audit-log.read'],
  },
  {
    role: UserRoleType.SUPPORT,
    permissions: [
      'sessions.read.supportSummary',
      'patients.read.admin',
      'careChat.request.read.admin',
      'careChat.conversation.read.admin',
      'support.ticket.assign',
    ],
  },
  {
    role: UserRoleType.PATIENT,
    permissions: [],
  },
  {
    role: UserRoleType.PRACTITIONER,
    permissions: [],
  },
];

export const authSeedModule: SeedModule = {
  name: 'auth',
  async run(prisma: PrismaClient): Promise<void> {
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
    }

    await prisma.rolePermission.deleteMany({});

    const permissionsByKey = await prisma.permission.findMany({
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
      permissionsByKey.map((permission) => [permission.key, permission.id]),
    );

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
      }
    }

    const passwordIdentitySeed = [
      {
        userId: seedIds.users.superAdmin,
        password: seedCredentials.superAdmin.password,
      },
      {
        userId: seedIds.users.supportAgent,
        password: seedCredentials.support.password,
      },
      {
        userId: seedIds.users.contentReviewer,
        password: seedCredentials.reviewer.password,
      },
      {
        userId: seedIds.users.patientA,
        password: seedCredentials.patientA.password,
      },
      {
        userId: seedIds.users.patientB,
        password: seedCredentials.patientB.password,
      },
      {
        userId: seedIds.users.practitionerA,
        password: seedCredentials.practitionerA.password,
      },
      {
        userId: seedIds.users.practitionerB,
        password: seedCredentials.practitionerB.password,
      },
      {
        userId: seedIds.users.practitionerC,
        password: seedCredentials.practitionerC.password,
      },
      {
        userId: seedIds.users.practitionerD,
        password: seedCredentials.practitionerD.password,
      },
      {
        userId: seedIds.users.practitionerE,
        password: seedCredentials.practitionerE.password,
      },
      {
        userId: seedIds.users.practitionerF,
        password: seedCredentials.practitionerF.password,
      },
      {
        userId: seedIds.users.practitionerG,
        password: seedCredentials.practitionerG.password,
      },
      {
        userId: seedIds.users.practitionerH,
        password: seedCredentials.practitionerH.password,
      },
      {
        userId: seedIds.users.practitionerI,
        password: seedCredentials.practitionerI.password,
      },
      {
        userId: seedIds.users.practitionerJ,
        password: seedCredentials.practitionerJ.password,
      },
    ];

    for (const identity of passwordIdentitySeed) {
      const passwordHash = await hashPassword(identity.password);
      const existing = await prisma.authIdentity.findFirst({
        where: {
          userId: identity.userId,
          provider: AuthProvider.PASSWORD,
        },
      });

      if (existing) {
        await prisma.authIdentity.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            isEnabled: true,
            lastUsedAt: null,
          },
        });
      } else {
        await prisma.authIdentity.create({
          data: {
            userId: identity.userId,
            provider: AuthProvider.PASSWORD,
            passwordHash,
            isEnabled: true,
          },
        });
      }
    }

    await prisma.authIdentity.upsert({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.GOOGLE,
          providerSubject: seedCredentials.patientB.googleSubject,
        },
      },
      create: {
        userId: seedIds.users.patientB,
        provider: AuthProvider.GOOGLE,
        providerSubject: seedCredentials.patientB.googleSubject,
        isEnabled: true,
      },
      update: {
        userId: seedIds.users.patientB,
        isEnabled: true,
      },
    });

    const twoFactorUsers = [
      seedIds.users.practitionerA,
      seedIds.users.practitionerB,
      seedIds.users.practitionerC,
      seedIds.users.practitionerD,
      seedIds.users.practitionerE,
      seedIds.users.practitionerF,
      seedIds.users.practitionerG,
      seedIds.users.practitionerH,
      seedIds.users.practitionerI,
      seedIds.users.practitionerJ,
    ];

    for (const userId of twoFactorUsers) {
      await prisma.twoFactorSetting.upsert({
        where: { userId },
        create: {
          userId,
          isRequired: true,
          preferredChannel: OtpChannel.EMAIL,
          fallbackChannel: OtpChannel.SMS,
          enabledAt: new Date(),
        },
        update: {
          isRequired: true,
          preferredChannel: OtpChannel.EMAIL,
          fallbackChannel: OtpChannel.SMS,
          enabledAt: new Date(),
        },
      });
    }

    await prisma.userSession.upsert({
      where: { id: seedIds.sessions.adminSession },
      create: {
        id: seedIds.sessions.adminSession,
        userId: seedIds.users.superAdmin,
        refreshTokenHash: 'seed-hash-admin-refresh-token',
        deviceId: 'seed-admin-browser',
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Agent',
        expiresAt: daysFromNow(30),
      },
      update: {
        revokedAt: null,
        expiresAt: daysFromNow(30),
      },
    });

    await prisma.userSession.upsert({
      where: { id: seedIds.sessions.patientSession },
      create: {
        id: seedIds.sessions.patientSession,
        userId: seedIds.users.patientA,
        refreshTokenHash: 'seed-hash-patient-refresh-token',
        deviceId: 'seed-patient-mobile',
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Mobile',
        expiresAt: daysFromNow(14),
      },
      update: {
        revokedAt: null,
        expiresAt: daysFromNow(14),
      },
    });

    await prisma.userSession.upsert({
      where: { id: seedIds.sessions.supportSession },
      create: {
        id: seedIds.sessions.supportSession,
        userId: seedIds.users.supportAgent,
        refreshTokenHash: 'seed-hash-support-refresh-token',
        deviceId: 'seed-support-browser',
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Browser',
        expiresAt: daysFromNow(21),
      },
      update: {
        revokedAt: null,
        expiresAt: daysFromNow(21),
      },
    });

    await prisma.userSession.upsert({
      where: { id: seedIds.sessions.patientBSession },
      create: {
        id: seedIds.sessions.patientBSession,
        userId: seedIds.users.patientB,
        refreshTokenHash: 'seed-hash-patient-b-refresh-token',
        deviceId: 'seed-patient-b-mobile',
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Mobile',
        expiresAt: daysFromNow(14),
      },
      update: {
        revokedAt: null,
        expiresAt: daysFromNow(14),
      },
    });

    await prisma.userSession.upsert({
      where: { id: seedIds.sessions.practitionerBSession },
      create: {
        id: seedIds.sessions.practitionerBSession,
        userId: seedIds.users.practitionerB,
        refreshTokenHash: 'seed-hash-practitioner-b-refresh-token',
        deviceId: 'seed-practitioner-b-browser',
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Browser',
        expiresAt: daysFromNow(21),
      },
      update: {
        revokedAt: null,
        expiresAt: daysFromNow(21),
      },
    });
  },
};
