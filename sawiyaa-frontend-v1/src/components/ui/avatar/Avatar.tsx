"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";

interface AvatarProps {
  src?: string | null; // URL of the avatar image
  alt?: string; // Alt text for the avatar
  name?: string; // User name to generate initials/alt
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge" | "custom"; // Avatar size
  status?: "online" | "offline" | "busy" | "none"; // Status indicator
  className?: string; // Custom container styling
  imgClassName?: string; // Custom image styling
  fallbackInitials?: string; // Optional initials fallback if default fails
}

export const DEFAULT_USER_AVATAR = "/images/default/user.avif";

const sizeClasses = {
  xsmall: "h-6 w-6 max-w-6",
  small: "h-8 w-8 max-w-8",
  medium: "h-10 w-10 max-w-10",
  large: "h-12 w-12 max-w-12",
  xlarge: "h-14 w-14 max-w-14",
  xxlarge: "h-16 w-16 max-w-16",
  custom: "",
};

const statusSizeClasses = {
  xsmall: "h-1.5 w-1.5 max-w-1.5",
  small: "h-2 w-2 max-w-2",
  medium: "h-2.5 w-2.5 max-w-2.5",
  large: "h-3 w-3 max-w-3",
  xlarge: "h-3.5 w-3.5 max-w-3.5",
  xxlarge: "h-4 w-4 max-w-4",
  custom: "h-3 w-3",
};

const statusColorClasses = {
  online: "bg-success-500",
  offline: "bg-error-400",
  busy: "bg-warning-500",
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = "medium",
  status = "none",
  className = "",
  imgClassName = "",
  fallbackInitials,
}) => {
  const locale = useLocale();
  const [imgSrc, setImgSrc] = useState<string>(src || DEFAULT_USER_AVATAR);
  const [isFallbackState, setIsFallbackState] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(src || DEFAULT_USER_AVATAR);
    setIsFallbackState(src ? false : true); // If src is missing, we are already rendering the fallback avatar
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!isFallbackState && imgSrc !== DEFAULT_USER_AVATAR) {
      setImgSrc(DEFAULT_USER_AVATAR);
      setIsFallbackState(true);
    } else {
      setHasError(true);
    }
  };

  const resolvedAlt = useMemo(() => {
    if (alt) return alt;
    if (name) {
      return locale === "ar"
        ? `الصورة الشخصية لـ ${name}`
        : `${name}'s profile picture`;
    }
    return locale === "ar" ? "الصورة الشخصية للمستخدم" : "User profile picture";
  }, [alt, name, locale]);

  const resolvedInitials = useMemo(() => {
    if (fallbackInitials) return fallbackInitials;
    if (!name) return "";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [fallbackInitials, name]);

  const hasCustomRounded = className.includes("rounded-");
  const roundedClass = hasCustomRounded ? "" : "rounded-full";
  const imgRoundedClass = imgClassName.includes("rounded-") ? "" : "rounded-full";

  return (
    <div className={`relative shrink-0 ${roundedClass} overflow-hidden ${sizeClasses[size]} ${className}`}>
      {hasError ? (
        resolvedInitials ? (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold text-text-muted dark:bg-slate-800">
            {resolvedInitials}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-text-muted dark:bg-slate-800">
            <svg className="w-1/2 h-1/2 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        )
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imgSrc}
          alt={resolvedAlt}
          onError={handleError}
          className={`object-cover w-full h-full ${imgRoundedClass} ${imgClassName}`}
        />
      )}

      {/* Status Indicator */}
      {status !== "none" && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-[1.5px] border-white dark:border-gray-900 ${
            statusSizeClasses[size]
          } ${statusColorClasses[status] || ""}`}
        ></span>
      )}
    </div>
  );
};

export default Avatar;
