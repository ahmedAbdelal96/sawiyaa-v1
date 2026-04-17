import React from "react";

interface AvatarTextProps {
  name: string;
  className?: string;
}

const AvatarText: React.FC<AvatarTextProps> = ({ name, className = "" }) => {
  // Generate initials from name
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Keep avatars calm and consistent with the shared theme rather than rainbow accents.
  const getColorClass = (name: string) => {
    const colors = [
      "app-avatar-shell",
      "bg-surface-tertiary text-text-primary ring-1 ring-inset ring-border-light dark:bg-surface-tertiary dark:text-text-primary",
      "bg-primary-light text-text-brand ring-1 ring-inset ring-primary/10 dark:bg-primary/15 dark:text-primary-light",
      "bg-surface-secondary text-text-primary ring-1 ring-inset ring-border-light dark:bg-surface-secondary dark:text-text-primary",
    ];

    const index = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div
      className={`flex h-10 w-10 ${className} items-center justify-center rounded-full ${getColorClass(
        name
      )}`}
    >
      <span className="text-sm font-semibold tracking-[0.04em]">{initials}</span>
    </div>
  );
};

export default AvatarText;
