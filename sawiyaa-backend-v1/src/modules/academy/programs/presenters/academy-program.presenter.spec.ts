import { AcademyProgramPresenter } from './academy-program.presenter';

describe('AcademyProgramPresenter', () => {
  const presenter = new AcademyProgramPresenter();

  it('prefers Arabic text for Arabic locale and English for English locale', () => {
    const program = {
      id: 'program-1',
      slug: 'academy-program',
      titleAr: 'برنامج الأكاديمية',
      titleEn: 'Academy Program',
      descriptionAr: 'الوصف العربي',
      descriptionEn: 'English description',
      coverImageUrl: null,
      category: null,
      priceEgp: null,
      priceUsd: null,
      registrationOpen: true,
      maxSeats: null,
      startAt: null,
      endAt: null,
      publishedAt: null,
    };

    expect(presenter.presentPublicProgramItem(program, 'ar').title).toBe(
      'برنامج الأكاديمية',
    );
    expect(presenter.presentPublicProgramItem(program, 'en').title).toBe(
      'Academy Program',
    );
  });

  it('falls back safely when localized fields are missing', () => {
    const program = {
      id: 'program-1',
      slug: 'academy-program',
      titleAr: '',
      titleEn: '',
      descriptionAr: null,
      descriptionEn: null,
      coverImageUrl: null,
      category: null,
      priceEgp: null,
      priceUsd: null,
      registrationOpen: true,
      maxSeats: null,
      startAt: null,
      endAt: null,
      publishedAt: null,
    };

    expect(presenter.presentPublicProgramItem(program, 'ar').title).toBe(
      'academy-program',
    );
    expect(presenter.presentPublicProgramItem(program, 'en').title).toBe(
      'academy-program',
    );
  });

  it('hides internal delivery fields from public session output', () => {
    const session = {
      id: 'session-1',
      academyProgramId: 'program-1',
      titleAr: 'جلسة 1',
      titleEn: 'Session 1',
      descriptionAr: 'تفاصيل',
      descriptionEn: 'Details',
      startsAt: new Date('2026-07-04T10:00:00.000Z'),
      endsAt: new Date('2026-07-04T11:00:00.000Z'),
      deliveryMethod: 'ZOOM' as const,
      internalDeliveryNote: 'admin only',
      internalDeliveryLink: 'https://internal.example.com',
      sortOrder: 1,
      isPublished: true,
      publishedAt: new Date('2026-07-04T09:00:00.000Z'),
      createdByUserId: 'user-1',
      createdAt: new Date('2026-07-04T08:00:00.000Z'),
      updatedAt: new Date('2026-07-04T08:30:00.000Z'),
    };

    const publicSession = presenter.presentPublicSessionItem(session, 'ar');
    expect(publicSession).toMatchObject({
      programId: 'program-1',
      title: 'جلسة 1',
      description: 'تفاصيل',
      deliveryMethod: 'ZOOM',
    });
    expect(publicSession).not.toHaveProperty('internalDeliveryNote');
    expect(publicSession).not.toHaveProperty('internalDeliveryLink');
  });

  it('returns PAID with the selected USD price for a non-Egyptian request', () => {
    const item = presenter.presentPublicProgramItem(
      {
        id: 'program-1', slug: 'academy-program', titleAr: 'Arabic', titleEn: 'English',
        descriptionAr: null, descriptionEn: null, coverImageUrl: null, category: null,
        priceEgp: { toString: () => '500.00' }, priceUsd: { toString: () => '20.00' },
        registrationOpen: true, maxSeats: null, startAt: null, endAt: null, publishedAt: null,
      },
      'en',
      null,
    );

    expect(item).toMatchObject({
      priceStatus: 'PAID',
      pricingStatus: 'AVAILABLE',
      priceAmount: '20.00',
      currencyCode: 'USD',
      reasonCode: null,
    });
  });

  it('returns PAID with the selected EGP price for an Egyptian request', () => {
    const item = presenter.presentPublicProgramItem(
      {
        id: 'program-1', slug: 'academy-program', titleAr: 'Arabic', titleEn: 'English',
        descriptionAr: null, descriptionEn: null, coverImageUrl: null, category: null,
        priceEgp: { toString: () => '500.00' }, priceUsd: { toString: () => '20.00' },
        registrationOpen: true, maxSeats: null, startAt: null, endAt: null, publishedAt: null,
      },
      'en',
      'EG',
    );

    expect(item).toMatchObject({
      priceStatus: 'PAID',
      priceAmount: '500.00',
      currencyCode: 'EGP',
      reasonCode: null,
    });
  });

  it('returns UNAVAILABLE when both configured regional prices are zero', () => {
    const item = presenter.presentPublicProgramItem(
      {
        id: 'program-free', slug: 'academy-program-free', titleAr: 'Arabic', titleEn: 'English',
        descriptionAr: null, descriptionEn: null, coverImageUrl: null, category: null,
        priceEgp: { toString: () => '0.00' }, priceUsd: { toString: () => '0.00' },
        registrationOpen: true, maxSeats: null, startAt: null, endAt: null, publishedAt: null,
      },
      'en',
      'EG',
    );

    expect(item).toMatchObject({
      priceStatus: 'UNAVAILABLE',
      priceAmount: null,
      currencyCode: null,
    });
  });

  it('returns UNAVAILABLE when the selected regional price is absent', () => {
    const item = presenter.presentPublicProgramItem(
      {
        id: 'program-missing-price', slug: 'academy-program-missing-price', titleAr: 'Arabic', titleEn: 'English',
        descriptionAr: null, descriptionEn: null, coverImageUrl: null, category: null,
        priceEgp: { toString: () => '500.00' }, priceUsd: null,
        registrationOpen: true, maxSeats: null, startAt: null, endAt: null, publishedAt: null,
      },
      'en',
      'US',
    );

    expect(item).toMatchObject({
      priceStatus: 'UNAVAILABLE',
      priceAmount: null,
      currencyCode: null,
      reasonCode: 'SELECTED_PRICE_MISSING',
    });
  });

  it('never turns a missing price into FREE', () => {
    const item = presenter.presentPublicProgramItem(
      {
        id: 'program-missing-price', slug: 'academy-program-missing-price', titleAr: 'Arabic', titleEn: 'English',
        descriptionAr: null, descriptionEn: null, coverImageUrl: null, category: null,
        priceEgp: null, priceUsd: null,
        registrationOpen: true, maxSeats: null, startAt: null, endAt: null, publishedAt: null,
      },
      'en',
      'US',
    );

    expect(item.priceStatus).toBe('UNAVAILABLE');
  });

  it('returns UNAVAILABLE for a negative selected regional price', () => {
    const item = presenter.presentPublicProgramItem(
      {
        id: 'program-negative-price', slug: 'academy-program-negative-price', titleAr: 'Arabic', titleEn: 'English',
        descriptionAr: null, descriptionEn: null, coverImageUrl: null, category: null,
        priceEgp: { toString: () => '500.00' }, priceUsd: { toString: () => '-20.00' },
        registrationOpen: true, maxSeats: null, startAt: null, endAt: null, publishedAt: null,
      },
      'en',
      'US',
    );

    expect(item).toMatchObject({
      priceStatus: 'UNAVAILABLE',
      priceAmount: null,
      currencyCode: null,
    });
  });
});
