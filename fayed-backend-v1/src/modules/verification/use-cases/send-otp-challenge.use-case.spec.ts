import { ServiceUnavailableException } from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { SendOtpChallengeUseCase } from './send-otp-challenge.use-case';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpDeliveryDispatcherService } from '../services/otp-delivery-dispatcher.service';

describe('SendOtpChallengeUseCase', () => {
  const otpChallengeRepository = {
    invalidate: jest.fn(),
  } as unknown as OtpChallengeRepository;
  const otpDeliveryDispatcherService = {
    dispatch: jest.fn(),
  } as unknown as OtpDeliveryDispatcherService;

  const useCase = new SendOtpChallengeUseCase(
    otpChallengeRepository,
    otpDeliveryDispatcherService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates the challenge when delivery fails', async () => {
    otpDeliveryDispatcherService.dispatch = jest.fn().mockResolvedValue({
      delivered: false,
      deliveryTarget: 'test@example.com',
      channel: OtpChannel.EMAIL,
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        userId: 'user-1',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
        channel: OtpChannel.EMAIL,
        target: 'test@example.com',
        code: '123456',
        expiresAt: new Date(),
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(otpChallengeRepository.invalidate).toHaveBeenCalledWith(
      'challenge-1',
    );
  });
});
