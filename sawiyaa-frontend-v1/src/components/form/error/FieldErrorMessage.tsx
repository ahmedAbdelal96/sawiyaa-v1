"use client";

type Props = {
  message?: string | null;
  className?: string;
  id?: string;
};

export function FieldErrorMessage({ message, className, id }: Props) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      className={`mt-1.5 text-xs text-status-danger ${className ?? ""}`}
      dir="auto"
    >
      {message}
    </p>
  );
}

export default FieldErrorMessage;
