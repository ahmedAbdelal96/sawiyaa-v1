import type React from "react";

interface CheckboxProps {
  label?: string;
  checked: boolean;
  className?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  disabled = false,
}) => {
  return (
    <label
      className={`group flex items-center space-x-3 cursor-pointer ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      <div className="relative w-5 h-5">
        <input
          id={id}
          type="checkbox"
          className={`h-5 w-5 appearance-none rounded-md border border-border-light bg-surface-tertiary text-primary accent-primary focus:ring-ring-focus focus:border-border-focus checked:bg-primary checked:border-primary disabled:bg-surface-tertiary/60 disabled:text-text-muted disabled:border-border-light disabled:opacity-60 disabled:cursor-not-allowed transition-colors
          ${className}`}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        {checked && (
          <svg
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
              disabled ? "text-text-muted" : "text-white"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
              stroke="currentColor"
              strokeWidth="1.94437"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && (
        <span className="text-sm font-medium text-text-secondary select-none">
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
