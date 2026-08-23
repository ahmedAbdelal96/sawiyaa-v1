export type DirectionalIconSemantic =
  | "back"
  | "forward"
  | "previous"
  | "next"
  | "disclosure";

export type DirectionalIconName =
  | "arrow-back"
  | "arrow-forward"
  | "chevron-back"
  | "chevron-forward";

export function getDirectionalIcon(
  semantic: DirectionalIconSemantic,
  isRTL: boolean,
): DirectionalIconName {
  switch (semantic) {
    case "back":
      return isRTL ? "arrow-forward" : "arrow-back";
    case "forward":
      return isRTL ? "arrow-back" : "arrow-forward";
    case "previous":
      return isRTL ? "chevron-forward" : "chevron-back";
    case "next":
      return isRTL ? "chevron-back" : "chevron-forward";
    case "disclosure":
      return isRTL ? "chevron-back" : "chevron-forward";
  }
}
