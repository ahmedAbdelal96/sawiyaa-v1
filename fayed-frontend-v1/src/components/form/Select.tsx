import React, { useState } from "react";

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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value); // Trigger parent handler
  };

  return (
    <div>
      <select
        className={`app-control h-11 w-full appearance-none px-4 py-2.5 pr-11 ${
          selectedValue
            ? "text-text-primary dark:text-text-primary"
            : "text-text-muted dark:text-text-muted"
        } ${
          error
            ? "border-error-500 text-error-800 focus:ring-error-500/10 dark:border-error-500 dark:text-error-400"
            : ""
        } ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
        value={selectedValue}
        onChange={handleChange}
        disabled={disabled}
      >
        {/* Placeholder option */}
        <option
          value=""
          disabled
          className="text-text-primary dark:bg-surface-secondary dark:text-text-secondary"
        >
          {placeholder}
        </option>
        {/* Map over options */}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-text-primary dark:bg-surface-secondary dark:text-text-secondary"
          >
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p className={`mt-1.5 text-xs ${error ? "text-error-500" : "text-text-secondary"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Select;
