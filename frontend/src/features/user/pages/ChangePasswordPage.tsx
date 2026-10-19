import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { changePassword } from '../api/profileService';
import { clearAuthSession } from '../../../lib/auth';
import { changePasswordSchema } from '../utils/profileSchemas';
import { APP_ROUTES } from '../../../config/constants';
import { CHANGE_PASSWORD_INITIAL_FORM } from '../../../shared/constants/constants';
import { EyeIcon, EyeSlashIcon } from '../../../shared/constants/icons';
import type { ChangePasswordFormState } from '../../../shared/models/ChangePasswordFormState';

const ChangePasswordPage: React.FC = () => {
  const [form, setForm] = useState<ChangePasswordFormState>(CHANGE_PASSWORD_INITIAL_FORM);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
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
          <div className="input-group">
            <input
              type={show.current ? 'text' : 'password'}
              id="cp-current"
              name="currentPassword"
              autoComplete="current-password"
              className={`form-control${touched.currentPassword && errors.currentPassword ? ' is-invalid' : ''}`}
              value={form.currentPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
              aria-label={show.current ? 'Hide password' : 'Show password'}
            >
              {show.current ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
            {touched.currentPassword && errors.currentPassword && (
              <div className="invalid-feedback">{errors.currentPassword}</div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="cp-new" className="form-label">New password</label>
          <div className="input-group">
            <input
              type={show.next ? 'text' : 'password'}
              id="cp-new"
              name="newPassword"
              autoComplete="new-password"
              className={`form-control${touched.newPassword && errors.newPassword ? ' is-invalid' : ''}`}
              value={form.newPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
              aria-label={show.next ? 'Hide password' : 'Show password'}
            >
              {show.next ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
            {touched.newPassword && errors.newPassword && (
              <div className="invalid-feedback">{errors.newPassword}</div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="cp-confirm" className="form-label">Confirm new password</label>
          <div className="input-group">
            <input
              type={show.confirm ? 'text' : 'password'}
              id="cp-confirm"
              name="confirmNewPassword"
              autoComplete="new-password"
              className={`form-control${touched.confirmNewPassword && errors.confirmNewPassword ? ' is-invalid' : ''}`}
              value={form.confirmNewPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
              aria-label={show.confirm ? 'Hide password' : 'Show password'}
            >
              {show.confirm ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
            {touched.confirmNewPassword && errors.confirmNewPassword && (
              <div className="invalid-feedback">{errors.confirmNewPassword}</div>
            )}
          </div>
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
