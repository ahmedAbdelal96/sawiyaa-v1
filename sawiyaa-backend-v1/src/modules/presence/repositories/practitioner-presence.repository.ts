import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * PractitionerPresenceRepository owns current live-state persistence only.
 * It does not infer or orchestrate availability, sessions, or bookings.
 */
@Injectable()
export class PractitionerPresenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  getByPractitionerProfileId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerPresence.findUnique({
      where: {
        practitionerId,
      },
    });
  }

  async createOrGetByPractitionerProfileId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const existing = await this.getByPractitionerProfileId(practitionerId, tx);

    if (existing) {
      return existing;
    }

    return this.getDb(tx).practitionerPresence.create({
      data: {
        practitionerId,
        status: PresenceStatus.OFFLINE,
        isInstantBookingEnabled: false,
      },
    });
  }

  async updateStatus(
    practitionerId: string,
    status: PresenceStatus,
    tx?: Prisma.TransactionClient,
  ) {
    await this.createOrGetByPractitionerProfileId(practitionerId, tx);

    return this.getDb(tx).practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        status,
        manuallySetAtUtc: new Date(),
        lastSeenAtUtc: new Date(),
      },
    });
  }

  async markOnline(practitionerId: string, tx?: Prisma.TransactionClient) {
    await this.createOrGetByPractitionerProfileId(practitionerId, tx);

    const now = new Date();

    return this.getDb(tx).practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        status: PresenceStatus.ONLINE,
        lastSeenAtUtc: now,
        lastHeartbeatAtUtc: now,
      },
    });
  }

  async updateInstantBookingEnabled(
    practitionerId: string,
    isInstantBookingEnabled: boolean,
    tx?: Prisma.TransactionClient,
  ) {
    await this.createOrGetByPractitionerProfileId(practitionerId, tx);

    return this.getDb(tx).practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        isInstantBookingEnabled,
        lastSeenAtUtc: new Date(),
      },
    });
  }

  async touchLastSeen(practitionerId: string, tx?: Prisma.TransactionClient) {
    await this.createOrGetByPractitionerProfileId(practitionerId, tx);

    return this.getDb(tx).practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        lastSeenAtUtc: new Date(),
      },
    });
  }

  async touchHeartbeat(practitionerId: string, tx?: Prisma.TransactionClient) {
    const current = await this.createOrGetByPractitionerProfileId(
      practitionerId,
      tx,
    );

    const now = new Date();
    const shouldPromoteToOnline =
      current.status === PresenceStatus.OFFLINE &&
      current.manuallySetAtUtc === null;

    return this.getDb(tx).practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        status: shouldPromoteToOnline ? PresenceStatus.ONLINE : current.status,
        lastSeenAtUtc: now,
        lastHeartbeatAtUtc: now,
      },
    });
  }
}
