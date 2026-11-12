import React from 'react';
import type { FormValues } from '../../models/professor/gradePanel';
import { FIELDS } from '../../constants/professor/constants';

type GradeFieldSetProps = {
  values: FormValues;
  errors: Record<keyof FormValues, string | null>;
  onChange: (key: keyof FormValues, value: string) => void;
};

const GradeFieldSet: React.FC<GradeFieldSetProps> = ({ values, errors, onChange }) => (
  <div className="mb-3">
    {FIELDS.map(field => (
      <div className="mb-2" key={field.key}>
        <label className="form-label small mb-1">
          {field.label}{' '}
          <span className="text-muted">(max {field.max})</span>
        </label>
        <input
          type="number"
          className={`form-control form-control-sm${errors[field.key] ? ' is-invalid' : ''}`}
          min={0}
          max={field.max}
          step={0.5}
          value={values[field.key]}
          onChange={e => onChange(field.key, e.target.value)}
        />
        {errors[field.key] && (
          <div className="invalid-feedback">{errors[field.key]}</div>
        )}
      </div>
    ))}
  </div>
);

export default GradeFieldSet;
