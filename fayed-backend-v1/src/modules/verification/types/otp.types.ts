import { OtpChannel, OtpPurpose } from '@prisma/client';

export type OtpChallengePayload = {
  challengeId: string;
  channel: OtpChannel;
  maskedTarget: string;
  expiresAt: Date;
  target: string;
  code: string;
};

export type OtpPolicy = {
  purpose: OtpPurpose;
  ttlMinutes: number;
  codeLength: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
  allowedChannels: OtpChannel[];
};

export type OtpDeliveryResult = {
  delivered: boolean;
  deliveryTarget: string;
  channel: OtpChannel;
  redirectTarget?: string;
};
