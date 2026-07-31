import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class GetMyBookingSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { userId: string }) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId: input.userId },
      select: {
        acceptsNormalBookings: true,
        presence: { select: { isInstantBookingEnabled: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    return {
      message: 'Booking settings fetched successfully',
      acceptsNormalBookings: profile.acceptsNormalBookings,
      isInstantBookingEnabled: profile.presence?.isInstantBookingEnabled ?? false,
    };
  }
}
