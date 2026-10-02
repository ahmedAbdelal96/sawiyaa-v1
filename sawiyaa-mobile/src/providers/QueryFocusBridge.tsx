import { useEffect } from "react";
import { AppState } from "react-native";
import { focusManager } from "@tanstack/react-query";

/**
 * React Query does not receive browser focus events on native platforms.
 * Forward the native app lifecycle so stale active queries can refresh when
 * the user returns to Sawiyaa instead of showing the previous snapshot.
 */
export default function QueryFocusBridge() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });

    focusManager.setFocused(AppState.currentState === "active");

    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);

  return null;
}
