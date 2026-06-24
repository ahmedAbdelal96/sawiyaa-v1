import React, { FC } from "react";

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const FileInput: FC<FileInputProps> = ({ className, onChange, ...props }) => {
  return (
    <input
      type="file"
      className={`h-11 w-full overflow-hidden rounded-xl border border-border-light bg-surface-tertiary text-sm text-text-secondary shadow-theme-xs transition-colors placeholder:text-text-muted file:mr-5 file:cursor-pointer file:rounded-l-xl file:border-0 file:border-r file:border-border-light file:bg-primary-light file:py-3 file:pl-3.5 file:pr-3 file:text-sm file:font-medium file:text-text-brand hover:file:bg-primary-light-hover focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-ring-focus dark:border-border-light dark:text-text-secondary dark:file:border-border-light dark:file:bg-surface-tertiary dark:file:text-text-primary dark:hover:file:bg-primary-light ${className}`}
      onChange={onChange}
      {...props}
    />
  );
};

export default FileInput;
