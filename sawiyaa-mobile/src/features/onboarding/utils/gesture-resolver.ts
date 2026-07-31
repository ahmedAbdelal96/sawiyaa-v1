/**
 * Pure utility function to resolve the next slide index based on swipe gesture dynamics
 * (distance, velocity, LTR/RTL layout, dominant direction, and slide bounds).
 */
export function resolveNextIndex({
  activeIndex,
  isRTL,
  dx,
  vx,
  width,
  dy = 0,
}: {
  activeIndex: number;
  isRTL: boolean;
  dx: number;
  vx: number;
  width: number;
  dy?: number;
}): number {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // 1. Reject if vertical movement is dominant or horizontal movement is too small
  if (absDy >= absDx || absDx <= 10) {
    return activeIndex;
  }

  const threshold = width * 0.25;
  let nextIndex = activeIndex;

  if (isRTL) {
    // Arabic RTL: swipe right (dx > 0) -> next slide, swipe left (dx < 0) -> prev slide
    if (dx > threshold || (vx > 0.5 && dx > 30)) {
      if (activeIndex < 2) nextIndex = activeIndex + 1;
    } else if (dx < -threshold || (vx < -0.5 && dx < -30)) {
      if (activeIndex > 0) nextIndex = activeIndex - 1;
    }
  } else {
    // English LTR: swipe left (dx < 0) -> next slide, swipe right (dx > 0) -> prev slide
    if (dx < -threshold || (vx < -0.5 && dx < -30)) {
      if (activeIndex < 2) nextIndex = activeIndex + 1;
    } else if (dx > threshold || (vx > 0.5 && dx > 30)) {
      if (activeIndex > 0) nextIndex = activeIndex - 1;
    }
  }

  return nextIndex;
}
