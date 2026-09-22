"use client";

import { useEffect, useRef } from "react";
import { trackPatientPractitionerView } from "../api/practitioner-view.api";

type Props = {
  slug: string;
  enabled: boolean;
};

export default function PatientPractitionerViewTracker({ slug, enabled }: Props) {
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !slug || trackedSlugRef.current === slug) return;

    trackedSlugRef.current = slug;
    void trackPatientPractitionerView(slug).catch(() => {
      // Profile rendering must remain successful when analytics is unavailable.
    });
  }, [enabled, slug]);

  return null;
}
