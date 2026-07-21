import React from "react";

interface TextareaProps {
  id?: string; // Optional field id for label association
  placeholder?: string; // Placeholder text
  rows?: number; // Number of rows
  value?: string; // Current value
  onChange?: (value: string) => void; // Change handler
  className?: string; // Additional CSS classes
  disabled?: boolean; // Disabled state
  error?: boolean; // Error state
  hint?: string; // Hint text to display
  maxLength?: number;
}

const TextArea: React.FC<TextareaProps> = ({
  id,
  placeholder = "Enter your message", // Default placeholder
  rows = 3, // Default number of rows
  value = "", // Current value
  onChange, // Change handler
  className = "", // Additional custom styles
  disabled = false, // Disabled state
  error = false, // Error state
  hint = "", // Default hint text
  maxLength,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  let textareaClasses = `w-full rounded-xl border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-text-muted focus:outline-hidden ${className}`;

  if (disabled) {
    textareaClasses += ` cursor-not-allowed border-border-light bg-surface-tertiary text-text-muted opacity-50 dark:border-border-light dark:bg-surface-tertiary dark:text-text-muted`;
  } else if (error) {
    textareaClasses += ` border-status-danger bg-surface-tertiary text-status-danger focus:ring-3 focus:ring-status-danger/10`;
  } else {
    textareaClasses += ` border-border-light bg-surface-tertiary text-text-primary focus:border-border-focus focus:ring-3 focus:ring-ring-focus`;
  }

  return (
    <div className="relative">
      <textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={handleChange}
        disabled={disabled}
        className={textareaClasses}
      />
      {hint && (
        <p
          className={`mt-2 text-sm ${
            error ? "text-status-danger" : "text-text-secondary"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;
