import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * PractitionerPresenceRepository owns current live-state persistence only.
 * It does not infer or orchestrate availability, sessions, or bookings.
 */
@Injectable()
export class PractitionerPresenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  getByPractitionerProfileId(practitionerId: string) {
    return this.prisma.practitionerPresence.findUnique({
      where: {
        practitionerId,
      },
    });
  }

  async createOrGetByPractitionerProfileId(practitionerId: string) {
    const existing = await this.getByPractitionerProfileId(practitionerId);

    if (existing) {
      return existing;
    }

    return this.prisma.practitionerPresence.create({
      data: {
        practitionerId,
        status: PresenceStatus.OFFLINE,
        isInstantBookingEnabled: false,
      },
    });
  }

  async updateStatus(practitionerId: string, status: PresenceStatus) {
    await this.createOrGetByPractitionerProfileId(practitionerId);

    return this.prisma.practitionerPresence.update({
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

  async updateInstantBookingEnabled(
    practitionerId: string,
    isInstantBookingEnabled: boolean,
  ) {
    await this.createOrGetByPractitionerProfileId(practitionerId);

    return this.prisma.practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        isInstantBookingEnabled,
        lastSeenAtUtc: new Date(),
      },
    });
  }

  async touchLastSeen(practitionerId: string) {
    await this.createOrGetByPractitionerProfileId(practitionerId);

    return this.prisma.practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        lastSeenAtUtc: new Date(),
      },
    });
  }

  async touchHeartbeat(practitionerId: string) {
    await this.createOrGetByPractitionerProfileId(practitionerId);

    const now = new Date();

    return this.prisma.practitionerPresence.update({
      where: {
        practitionerId,
      },
      data: {
        lastSeenAtUtc: now,
        lastHeartbeatAtUtc: now,
      },
    });
  }
}
