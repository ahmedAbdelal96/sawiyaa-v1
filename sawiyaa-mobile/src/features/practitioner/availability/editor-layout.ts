export const AVAILABILITY_EDITOR_GRID_GAP = 8;
const AVAILABILITY_EDITOR_GRID_MIN_SLOT_WIDTH = 96;
const AVAILABILITY_EDITOR_GRID_INNER_INSET = 34;

export function getAvailabilityEditorGridLayout(
  windowWidth: number,
  measuredOuterWidth?: number | null,
) {
  const measuredInnerWidth = measuredOuterWidth
    ? measuredOuterWidth - AVAILABILITY_EDITOR_GRID_INNER_INSET
    : null;
  const availableWidth = Math.max(
    measuredInnerWidth ?? windowWidth - 100,
    AVAILABILITY_EDITOR_GRID_MIN_SLOT_WIDTH * 2 + AVAILABILITY_EDITOR_GRID_GAP,
  );
  const canFitThreeColumns = availableWidth >= AVAILABILITY_EDITOR_GRID_MIN_SLOT_WIDTH * 3 + AVAILABILITY_EDITOR_GRID_GAP * 2;
  const columns = windowWidth >= 420 && canFitThreeColumns ? 3 : 2;
  const slotWidth = Math.floor((availableWidth - AVAILABILITY_EDITOR_GRID_GAP * (columns - 1)) / columns);

  return { columns, gap: AVAILABILITY_EDITOR_GRID_GAP, slotWidth };
}
