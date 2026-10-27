import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { changePassword } from '../api/profileService';
import { clearAuthSession } from '../../../lib/auth';
import { changePasswordSchema } from '../utils/profileSchemas';
import { APP_ROUTES } from '../../../config/constants';
import { CHANGE_PASSWORD_INITIAL_FORM } from '../../../shared/constants/constants';
import type { ChangePasswordFormState } from '../../../shared/models/ChangePasswordFormState';
import PasswordInput from '../../../components/ui/PasswordInput';

const ChangePasswordPage: React.FC = () => {
  const [form, setForm] = useState<ChangePasswordFormState>(CHANGE_PASSWORD_INITIAL_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (values: ChangePasswordFormState): Record<string, string> => {
    const result = changePasswordSchema.safeParse(values);
    if (result.success) return {};
    return Object.fromEntries(
      result.error.issues.map((issue) => [issue.path[0] as string, issue.message])
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newForm = { ...form, [e.target.name]: e.target.value };
    setForm(newForm);
    if (touched[e.target.name]) {
      setErrors(validate(newForm));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
    setErrors(validate(form));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched = { currentPassword: true, newPassword: true, confirmNewPassword: true };
    setTouched(allTouched);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed — please sign in with your new password.');
      clearAuthSession({ redirectToLogin: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 400) {
        setErrors((prev) => ({
          ...prev,
          currentPassword: axiosErr.response?.data?.message ?? 'Current password is incorrect.',
        }));
        setTouched((prev) => ({ ...prev, currentPassword: true }));
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 480 }}>
      <h1 className="mb-1">Change Password</h1>
      <p className="text-muted mb-4">You will be signed out of all sessions after a successful change.</p>

      <form onSubmit={handleSubmit} noValidate>
        {apiError && (
          <div className="alert alert-danger" role="alert">
            {apiError}
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="cp-current" className="form-label">Current password</label>
          <PasswordInput
            id="cp-current"
            name="currentPassword"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            isInvalid={!!(touched.currentPassword && errors.currentPassword)}
          />
          {touched.currentPassword && errors.currentPassword && (
            <div className="invalid-feedback d-block">{errors.currentPassword}</div>
          )}
        </div>

        <div className="mb-3">
          <label htmlFor="cp-new" className="form-label">New password</label>
          <PasswordInput
            id="cp-new"
            name="newPassword"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            isInvalid={!!(touched.newPassword && errors.newPassword)}
          />
          {touched.newPassword && errors.newPassword && (
            <div className="invalid-feedback d-block">{errors.newPassword}</div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="cp-confirm" className="form-label">Confirm new password</label>
          <PasswordInput
            id="cp-confirm"
            name="confirmNewPassword"
            autoComplete="new-password"
            value={form.confirmNewPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            isInvalid={!!(touched.confirmNewPassword && errors.confirmNewPassword)}
          />
          {touched.confirmNewPassword && errors.confirmNewPassword && (
            <div className="invalid-feedback d-block">{errors.confirmNewPassword}</div>
          )}
        </div>

        <div className="d-flex gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Changing…
              </>
            ) : (
              'Change password'
            )}
          </button>
          <Link to={APP_ROUTES.PROFILE} className="btn btn-outline-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordPage;
