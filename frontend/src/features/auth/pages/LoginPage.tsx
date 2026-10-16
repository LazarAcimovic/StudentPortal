import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../../store/user/useUserStore";
import { USER_ROLES } from "../../../shared/constants/constants";
import { EyeIcon, EyeSlashIcon } from "../../../shared/constants/icons";
import { login } from "../api/authService";
import { loginSchema } from "../models/schemas/loginSchema";
import type { LoginFormValues } from "../models/schemas/loginSchema";
import { APP_ROUTES } from "../../../config/constants";
import {
  LOGIN_INITIAL_VALUES,
  LOGIN_INITIAL_TOUCHED,
  LOGIN_INITIAL_SERVER_ERROR,
  LOGIN_INITIAL_SHOW_PASSWORD,
  LOGIN_INITIAL_IS_SUBMITTING,
} from "../constants/constants";

const LoginPage: React.FC = () => {
  const [values, setValues] = useState<LoginFormValues>(LOGIN_INITIAL_VALUES);
  const [touched, setTouched] = useState<Record<keyof LoginFormValues, boolean>>(LOGIN_INITIAL_TOUCHED);
  const [serverError, setServerError] = useState<string | null>(LOGIN_INITIAL_SERVER_ERROR);
  const [showPassword, setShowPassword] = useState(LOGIN_INITIAL_SHOW_PASSWORD);
  const [isSubmitting, setIsSubmitting] = useState(LOGIN_INITIAL_IS_SUBMITTING);

  const navigate = useNavigate();
  const { setCurrentUser } = useUserStore();

  const parseResult = loginSchema.safeParse(values);
  const fieldErrors = parseResult.success ? {} : parseResult.error.flatten().fieldErrors;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!parseResult.success) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const user = await login(parseResult.data);
      setCurrentUser(user);

      if (user.userRole === USER_ROLES.Admin) {
        navigate(APP_ROUTES.ADMIN_DASHBOARD);
      } else if (user.userRole === USER_ROLES.Professor) {
        navigate(APP_ROUTES.PROFESSOR_DASHBOARD);
      } else {
        navigate(APP_ROUTES.STUDENT_DASHBOARD);
      }
    } catch {
      setServerError("Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header text-center">
              <h3>Login</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} noValidate>
                {serverError && (
                  <div className="alert alert-danger">{serverError}</div>
                )}

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-control${touched.email && fieldErrors.email ? " is-invalid" : ""}`}
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="email"
                  />
                  {touched.email && fieldErrors.email && (
                    <div className="invalid-feedback">{fieldErrors.email[0]}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      className={`form-control${touched.password && fieldErrors.password ? " is-invalid" : ""}`}
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                    {touched.password && fieldErrors.password && (
                      <div className="invalid-feedback">{fieldErrors.password[0]}</div>
                    )}
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Logging in…" : "Log in"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
