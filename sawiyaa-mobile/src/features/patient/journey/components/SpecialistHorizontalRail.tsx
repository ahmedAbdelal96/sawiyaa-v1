import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { HomeSectionHeading } from "./HomeSectionHeading";
import {
  SPECIALIST_CARD_GAP,
  SPECIALIST_CARD_WIDTH,
  SpecialistCompactCard,
} from "./SpecialistCompactCard";
import type { PatientHomePractitionerItemDto } from "../types";

const AUTO_SCROLL_MS = 3500;
const RESUME_DELAY_MS = 1800;
const RAIL_SIDE_PADDING = 12;

export function SpecialistHorizontalRail({
  title,
  items,
  locale,
  variant = "default",
}: {
  title: string;
  items: PatientHomePractitionerItemDto[];
  locale: string;
  variant?: "default" | "topRated" | "recentlyVisited" | "featured";
}) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const listRef = useRef<FlatList<PatientHomePractitionerItemDto> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const isRTL = i18n.language?.startsWith("ar") ?? false;
  const snapInterval = SPECIALIST_CARD_WIDTH + SPECIALIST_CARD_GAP;

  const normalizedItems = useMemo(() => {
    return isRTL ? [...items].reverse() : items;
  }, [isRTL, items]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedItems.length]);

  useEffect(() => {
    if (normalizedItems.length <= 1 || isUserInteracting) {
      return;
    }

    const interval = setInterval(() => {
      const next = activeIndex + 1 >= normalizedItems.length ? 0 : activeIndex + 1;
      listRef.current?.scrollToOffset({
        offset: next * snapInterval,
        animated: true,
      });
      setActiveIndex(next);
    }, AUTO_SCROLL_MS);

    return () => clearInterval(interval);
  }, [activeIndex, isUserInteracting, normalizedItems.length, snapInterval]);

  useEffect(
    () => () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    },
    [],
  );

  const pauseAuto = () => {
    setIsUserInteracting(true);
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const resumeAutoDelayed = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      setIsUserInteracting(false);
      resumeTimerRef.current = null;
    }, RESUME_DELAY_MS);
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(normalizedItems.length - 1, Math.round(x / snapInterval)));
    setActiveIndex(index);
    resumeAutoDelayed();
  };

  if (!normalizedItems.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <HomeSectionHeading title={title} />
      <FlatList
        ref={(node) => {
          listRef.current = node;
        }}
        data={normalizedItems}
        horizontal
        keyExtractor={(item) => `${item.practitionerId}:${item.slug}`}
        renderItem={({ item, index }) => (
          <SpecialistCompactCard
            item={item}
            locale={locale}
            variant={variant}
            rank={variant === "topRated" ? index + 1 : undefined}
            onPress={() => router.push(`/(patient)/discovery/${item.slug}` as any)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
        ItemSeparatorComponent={() => <View style={{ width: SPECIALIST_CARD_GAP }} />}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        onScrollBeginDrag={pauseAuto}
        onTouchStart={pauseAuto}
        onScrollEndDrag={resumeAutoDelayed}
        onMomentumScrollEnd={onMomentumEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  railContent: {
    paddingHorizontal: RAIL_SIDE_PADDING,
    paddingBottom: 2,
  },
});
