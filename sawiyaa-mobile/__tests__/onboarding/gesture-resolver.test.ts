import { resolveNextIndex } from "../../src/features/onboarding/utils/gesture-resolver";

describe("Gesture Resolver Unit Tests", () => {
  const width = 390;

  describe("English (LTR) Gestures", () => {
    it("advances index on swipe left exceeding threshold", () => {
      expect(resolveNextIndex({ activeIndex: 0, isRTL: false, dx: -100, vx: -0.6, width })).toBe(1);
    });

    it("moves backward on swipe right exceeding threshold", () => {
      expect(resolveNextIndex({ activeIndex: 1, isRTL: false, dx: 100, vx: 0.6, width })).toBe(0);
    });

    it("does not move past first slide backward", () => {
      expect(resolveNextIndex({ activeIndex: 0, isRTL: false, dx: 100, vx: 0.6, width })).toBe(0);
    });

    it("does not move past final slide forward", () => {
      expect(resolveNextIndex({ activeIndex: 2, isRTL: false, dx: -100, vx: -0.6, width })).toBe(2);
    });
  });

  describe("Arabic (RTL) Gestures", () => {
    it("advances index on swipe right exceeding threshold", () => {
      expect(resolveNextIndex({ activeIndex: 0, isRTL: true, dx: 100, vx: 0.6, width })).toBe(1);
    });

    it("moves backward on swipe left exceeding threshold", () => {
      expect(resolveNextIndex({ activeIndex: 1, isRTL: true, dx: -100, vx: -0.6, width })).toBe(0);
    });

    it("does not move past first slide backward", () => {
      expect(resolveNextIndex({ activeIndex: 0, isRTL: true, dx: -100, vx: -0.6, width })).toBe(0);
    });

    it("does not move past final slide forward", () => {
      expect(resolveNextIndex({ activeIndex: 2, isRTL: true, dx: 100, vx: 0.6, width })).toBe(2);
    });
  });

  describe("Shared Rejection / Noise Cases", () => {
    it("rejects small horizontal gestures below threshold", () => {
      expect(resolveNextIndex({ activeIndex: 0, isRTL: false, dx: -5, vx: -0.1, width })).toBe(0);
    });

    it("rejects vertical-dominant gestures (dx < dy)", () => {
      expect(resolveNextIndex({ activeIndex: 0, isRTL: false, dx: -50, vx: -0.3, width, dy: 100 })).toBe(0);
    });
  });
});
