import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import type { User } from '../../../../shared/models/User';
import { USER_ROLES } from '../../../../shared/constants/constants';
import type { UserRole } from '../../../../shared/constants/constants';
import axiosClient from '../../../../shared/api/axiosClient';
import { API_ROUTES } from '../../../../config/constants';
import FormField from '../../../../components/ui/FormField';
import FormAlert from '../../../../components/ui/FormAlert';

interface UserEditFormProps {
  scope: 'self' | 'admin';
  // callerRole: role of the logged-in user doing the editing
  callerRole: UserRole;
  // user: the person being edited (target)
  user: User;
  onSaved: (updatedUser: User) => void;
  onCancel?: () => void;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  indexNumber: string;
  isDeleted: boolean;
}

const UserEditForm: React.FC<UserEditFormProps> = ({
  scope,
  callerRole,
  user,
  onSaved,
  onCancel,
}) => {
  // Field visibility — PRD §5.9 matrix
  // Email: always in admin scope; in self scope only when caller is Admin
  const showEmail = scope === 'admin' || callerRole === USER_ROLES.Admin;
  // IndexNumber: admin editing a Student only
  const showIndexNumber = scope === 'admin' && user.userRole === USER_ROLES.Student;
  // Inactive: admin editing anyone who is NOT another Admin. A user's role is fixed
  // at creation and is no longer editable from this form (removed per D-048).
  const showIsDeleted = scope === 'admin' && user.userRole !== USER_ROLES.Admin;

  const [form, setForm] = useState<FormState>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    indexNumber: user.indexNumber ?? '',
    isDeleted: user.isDeleted,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (values: FormState): Record<string, string> => {
    const shape: Record<string, z.ZodTypeAny> = {
      firstName: z.string().min(1, 'First name is required').max(50, 'Maximum 50 characters'),
      lastName: z.string().min(1, 'Last name is required').max(50, 'Maximum 50 characters'),
    };
    if (showEmail) {
      shape.email = z
        .string()
        .min(1, 'Email is required')
        .max(100, 'Maximum 100 characters')
        .email('Invalid email format');
    }
    const result = z.object(shape).safeParse(values);
    if (result.success) return {};
    return Object.fromEntries(
      result.error.issues.map((issue) => [issue.path[0] as string, issue.message])
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    const newForm = { ...form, [name]: newValue };
    setForm(newForm);

    if (touched[name]) {
      setErrors(validate(newForm));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(form));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {
      firstName: true,
      lastName: true,
      ...(showEmail && { email: true }),
    };
    setTouched(allTouched);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      if (scope === 'self') {
        const payload: Record<string, unknown> = {
          FirstName: form.firstName,
          LastName: form.lastName,
        };
        if (showEmail) payload.Email = form.email;

        await axiosClient.put(API_ROUTES.ACCOUNT_PROFILE, payload);
        toast.success("Profile saved successfully.");
        onSaved({
          ...user,
          firstName: form.firstName,
          lastName: form.lastName,
          ...(showEmail && { email: form.email }),
        });
      } else {
        const payload: Record<string, unknown> = {
          FirstName: form.firstName,
          LastName: form.lastName,
          Email: form.email,
        };
        if (showIndexNumber) payload.IndexNumber = form.indexNumber;
        if (showIsDeleted) payload.IsDeleted = form.isDeleted;

        await axiosClient.put(`${API_ROUTES.USER}/${user.id}`, payload);
        toast.success("Changes saved.");
        // The admin update response intentionally omits IsDeleted (per D-035),
        // so reflect the just-saved values from the form, not the response body.
        onSaved({
          ...user,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          ...(showIndexNumber && { indexNumber: form.indexNumber }),
          ...(showIsDeleted && { isDeleted: form.isDeleted }),
        });
      }
    } catch {
      setApiError('Failed to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormAlert message={apiError} />

      <FormField
        id="uef-firstName"
        label="First Name"
        error={touched.firstName && errors.firstName ? errors.firstName : undefined}
      >
        <input
          type="text"
          id="uef-firstName"
          name="firstName"
          autoComplete="given-name"
          className={`form-control${
            touched.firstName && errors.firstName ? ' is-invalid' : ''
          }`}
          value={form.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </FormField>

      <FormField
        id="uef-lastName"
        label="Last Name"
        error={touched.lastName && errors.lastName ? errors.lastName : undefined}
      >
        <input
          type="text"
          id="uef-lastName"
          name="lastName"
          autoComplete="family-name"
          className={`form-control${
            touched.lastName && errors.lastName ? ' is-invalid' : ''
          }`}
          value={form.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </FormField>

      {showEmail && (
        <FormField
          id="uef-email"
          label="Email"
          error={touched.email && errors.email ? errors.email : undefined}
        >
          <input
            type="email"
            id="uef-email"
            name="email"
            autoComplete="email"
            className={`form-control${
              touched.email && errors.email ? ' is-invalid' : ''
            }`}
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </FormField>
      )}

      {showIndexNumber && (
        <FormField id="uef-indexNumber" label="Index Number">
          <input
            type="text"
            id="uef-indexNumber"
            name="indexNumber"
            autoComplete="off"
            className="form-control"
            value={form.indexNumber}
            onChange={handleChange}
          />
        </FormField>
      )}

      {showIsDeleted && (
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            id="uef-isDeleted"
            name="isDeleted"
            className="form-check-input"
            checked={form.isDeleted}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="uef-isDeleted">
            Inactive
          </label>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
};

export default UserEditForm;
