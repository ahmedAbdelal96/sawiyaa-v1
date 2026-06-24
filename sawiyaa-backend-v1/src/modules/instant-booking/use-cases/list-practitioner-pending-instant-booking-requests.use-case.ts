import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';

@Injectable()
export class ListPractitionerPendingInstantBookingRequestsUseCase {
  constructor(
    private readonly instantBookingPractitionerRepository: InstantBookingPractitionerRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly instantBookingMapper: InstantBookingMapper,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const practitioner =
      await this.instantBookingPractitionerRepository.findByUserId(
        input.userId,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.practitionerNotFound',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_FOUND',
      });
    }

    const now = new Date();
    await this.instantBookingRequestRepository.markExpired(now, {
      practitionerId: practitioner.id,
    });

    const requests =
      await this.instantBookingRequestRepository.listPendingPractitionerRequests(
        practitioner.id,
        now,
      );

    return {
      items: requests.map((request) =>
        this.instantBookingMapper.toViewModel(request),
      ),
    };
  }
}
