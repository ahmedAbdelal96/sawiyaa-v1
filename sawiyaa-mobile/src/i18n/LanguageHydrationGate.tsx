import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { getLanguageHydrationPromise } from "./index";

type Props = {
  children: React.ReactNode;
};

/**
 * Keeps routed screens from rendering with the device fallback language while
 * the user's persisted language is being restored from local storage.
 */
export default function LanguageHydrationGate({ children }: Props) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    getLanguageHydrationPromise()
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: "#F7F4EE" }} />;
  }

  return <>{children}</>;
}
