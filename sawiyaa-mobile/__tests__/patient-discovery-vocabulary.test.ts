import ar from "../src/i18n/locales/ar.json";
import en from "../src/i18n/locales/en.json";

describe("patient discovery vocabulary", () => {
  it("uses specialist language in both locales", () => {
    expect(ar.discovery.list.header).toBe("اكتشف");
    expect(ar.discovery.list.searchPlaceholder).toBe("ابحث عن مختص أو تخصص");
    expect(ar.discovery.list.professionalFallback).toBe("مختص");
    expect(en.discovery.list.header).toBe("Discover");
    expect(en.discovery.list.searchPlaceholder).toBe("Search specialists or specialties");
    expect(en.discovery.list.professionalFallback).toBe("Specialist");
  });
});
