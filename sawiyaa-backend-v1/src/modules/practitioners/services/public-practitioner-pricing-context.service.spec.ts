import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PublicPractitionerPricingContextService } from './public-practitioner-pricing-context.service';

describe('PublicPractitionerPricingContextService', () => {
  it('does not read profile country when resolving trusted request pricing', async () => {
    const patientProfileRepository = {
      findByUserId: jest.fn(),
    } as unknown as PatientProfileRepository;
    const Service = PublicPractitionerPricingContextService as any;
    const service = new Service(patientProfileRepository) as PublicPractitionerPricingContextService;

    await service.resolve({
      currentUserId: 'patient-1',
      guestCountryIsoCode: 'US',
    });

    expect(patientProfileRepository.findByUserId).not.toHaveBeenCalled();
  });
});
