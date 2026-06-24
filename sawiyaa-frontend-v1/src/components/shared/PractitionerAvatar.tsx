"use client";

import { useEffect, useState } from "react";

const DEFAULT_USER_AVATAR = "/images/default/user.avif";

interface PractitionerAvatarProps {
  src: string | null | undefined;
  alt: string | null | undefined;
  initials: string;
  className?: string;
}

export default function PractitionerAvatar({
  src,
  alt,
  initials,
  className = "",
}: PractitionerAvatarProps) {
  const [displayedSrc, setDisplayedSrc] = useState(DEFAULT_USER_AVATAR);

  useEffect(() => {
    const hasValidSrc = src && src.trim() !== "";

    if (!hasValidSrc) {
      setDisplayedSrc(DEFAULT_USER_AVATAR);
      return;
    }

    // Always start with default, then preload the real image
    setDisplayedSrc(DEFAULT_USER_AVATAR);

    const img = new Image();
    img.onload = () => {
      setDisplayedSrc(src);
    };
    img.onerror = () => {
      // Keep default — no broken image shown
      setDisplayedSrc(DEFAULT_USER_AVATAR);
    };
    img.src = src;
  }, [src]);

  return (
    <img
      src={displayedSrc}
      alt={alt ?? "Practitioner"}
      className={className}
    />
  );
}
