import React from "react";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  helpText?: string;
  helpTextId?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  helpText,
  helpTextId,
  children,
}) => (
  <div className="mb-3">
    <label htmlFor={id} className="form-label">
      {label}
    </label>
    {children}
    {error && <div className="invalid-feedback d-block">{error}</div>}
    {helpText && (
      <div id={helpTextId} className="form-text">
        {helpText}
      </div>
    )}
  </div>
);

export default FormField;
