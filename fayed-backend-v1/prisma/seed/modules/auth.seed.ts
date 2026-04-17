import { AuthProvider, OtpChannel, PrismaClient } from '@prisma/client';
import { seedCredentials, seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysFromNow, hashPassword } from '../shared/seed.utils';

/**
 * Auth seed module owns identities, two-factor preferences, and sample sessions.
 * This keeps authentication-related seed records isolated from user/profile domain seeds.
 */
export const authSeedModule: SeedModule = {
  name: 'auth',
  async run(prisma: PrismaClient): Promise<void> {
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
  },
};
