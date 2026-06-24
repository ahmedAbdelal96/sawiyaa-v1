import { Injectable } from '@nestjs/common';
import { OtpChannel } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * TwoFactorSetting drives which verified channel should receive practitioner OTP codes.
 */
@Injectable()
export class TwoFactorSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.twoFactorSetting.findUnique({
      where: { userId },
    });
  }

  upsertPractitionerDefault(userId: string, preferredChannel: OtpChannel) {
    return this.prisma.twoFactorSetting.upsert({
      where: { userId },
      create: {
        userId,
        isRequired: true,
        preferredChannel,
        enabledAt: new Date(),
      },
      update: {
        isRequired: true,
        preferredChannel,
        enabledAt: new Date(),
      },
    });
  }
}
