import Avatar from "@/components/ui/avatar/Avatar";

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
  return (
    <Avatar
      src={src}
      alt={alt ?? undefined}
      fallbackInitials={initials}
      size="custom"
      className={className}
      imgClassName={className}
    />
  );
}
