import { localizeSpecialtyCategoryName } from './localize-specialty-category.util';

describe('localizeSpecialtyCategoryName', () => {
  it('uses the requested category field and falls back to the other language', () => {
    expect(
      localizeSpecialtyCategoryName('ar', {
        nameAr: 'الصحة النفسية',
        nameEn: 'Mental Health',
        fallback: 'legacy-category',
      }),
    ).toBe('الصحة النفسية');

    expect(
      localizeSpecialtyCategoryName('en', {
        nameAr: 'الصحة النفسية',
        nameEn: 'Mental Health',
        fallback: 'legacy-category',
      }),
    ).toBe('Mental Health');

    expect(
      localizeSpecialtyCategoryName('ar', {
        nameAr: null,
        nameEn: 'Mental Health',
        fallback: 'legacy-category',
      }),
    ).toBe('Mental Health');
  });
});
