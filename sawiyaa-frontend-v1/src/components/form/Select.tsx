import React, { useEffect, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
  disabled = false,
  error = false,
  hint,
}) => {
  // Manage the selected value
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value); // Trigger parent handler
  };

  return (
    <div>
      <div className="relative">
        <select
          className={`h-11 w-full rounded-xl border appearance-none px-4 pe-10 text-sm transition-colors bg-surface-tertiary border-border-light text-text-primary focus:border-border-focus focus:ring-ring-focus focus:outline-hidden focus:ring-3 ${
            selectedValue ? "text-text-primary" : "text-text-muted"
          } ${
            error
              ? "border-status-danger text-status-danger focus:ring-status-danger/10"
              : ""
          } ${
            disabled
              ? "bg-surface-tertiary/60 text-text-muted border-border-light opacity-60 cursor-not-allowed"
              : ""
          } ${className}`}
          value={selectedValue}
          onChange={handleChange}
          disabled={disabled}
        >
          {/* Placeholder option */}
          <option
            value=""
            disabled
            className="text-text-muted bg-surface-tertiary dark:bg-surface-tertiary"
          >
            {placeholder}
          </option>
          {/* Map over options */}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="text-text-primary bg-surface-tertiary dark:bg-surface-tertiary"
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className={`pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-muted ${disabled ? "opacity-60" : ""}`}>
          <svg
            className="stroke-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {hint ? (
        <p className={`mt-1.5 text-xs ${error ? "text-status-danger" : "text-text-secondary"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Select;
