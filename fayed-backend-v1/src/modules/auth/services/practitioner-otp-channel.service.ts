import { ForbiddenException, Injectable } from '@nestjs/common';
import { OtpChannel, TwoFactorSetting } from '@prisma/client';

type PractitionerContactState = {
  emails: Array<{ email: string; isPrimary: boolean; isVerified: boolean }>;
  phones: Array<{ phone: string; isPrimary: boolean; isVerified: boolean }>;
};

/**
 * Practitioner OTP must only go to a verified channel.
 * This service centralizes the fallback order so password login and password reset stay consistent.
 */
@Injectable()
export class PractitionerOtpChannelService {
  resolveVerifiedChannel(
    contactState: PractitionerContactState,
    settings: TwoFactorSetting | null,
  ): { channel: OtpChannel; target: string } {
    const verifiedSecondaryEmail = contactState.emails.find(
      (email) => !email.isPrimary && email.isVerified,
    );
    const verifiedPrimaryEmail =
      contactState.emails.find((email) => email.isPrimary && email.isVerified) ??
      contactState.emails.find((email) => email.isVerified);
    const verifiedPrimaryPhone =
      contactState.phones.find((phone) => phone.isPrimary && phone.isVerified) ??
      contactState.phones.find((phone) => phone.isVerified);

    const channelOrder = [
      settings?.preferredChannel,
      settings?.fallbackChannel,
      OtpChannel.EMAIL,
      OtpChannel.SMS,
    ].filter(Boolean) as OtpChannel[];

    for (const channel of channelOrder) {
      if (channel === OtpChannel.EMAIL && verifiedPrimaryEmail) {
        return {
          channel,
          target: verifiedSecondaryEmail?.email ?? verifiedPrimaryEmail.email,
        };
      }

      if (channel === OtpChannel.SMS && verifiedPrimaryPhone) {
        return {
          channel,
          target: verifiedPrimaryPhone.phone,
        };
      }
    }

    throw new ForbiddenException({
      messageKey: 'auth.errors.verifiedOtpChannelRequired',
      error: 'VERIFIED_OTP_CHANNEL_REQUIRED',
    });
  }
}
