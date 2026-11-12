import React, { useState } from "react";
import type { CreateUser } from "../../../../shared/models/User";
import { USER_ROLES } from "../../../../shared/constants/constants";
import PasswordInput from "../../../../components/ui/PasswordInput";
import FormField from "../../../../components/ui/FormField";
import FormAlert from "../../../../components/ui/FormAlert";
import { createUserSchema } from "../../utils/userSchemas";
import type { AddUserResult, AddUserFieldErrors } from "../../api/userService";

interface UserCreateFormProps {
  onSave: (newUser: CreateUser) => Promise<AddUserResult>;
  onCancel: () => void;
}

const INITIAL_VALUES: CreateUser = {
  FirstName: "",
  LastName: "",
  Email: "",
  Password: "",
  UserRole: USER_ROLES.Student,
  IndexNumber: "",
};

const INITIAL_TOUCHED: Record<keyof CreateUser, boolean> = {
  FirstName: false,
  LastName: false,
  Email: false,
  Password: false,
  UserRole: false,
  IndexNumber: false,
};

const UserCreateForm: React.FC<UserCreateFormProps> = ({ onSave, onCancel }) => {
  const [values, setValues] = useState<CreateUser>(INITIAL_VALUES);
  const [touched, setTouched] =
    useState<Record<keyof CreateUser, boolean>>(INITIAL_TOUCHED);
  const [serverFieldErrors, setServerFieldErrors] = useState<AddUserFieldErrors>(
    {}
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseResult = createUserSchema.safeParse(values);
  const fieldErrors = parseResult.success
    ? {}
    : parseResult.error.flatten().fieldErrors;

  // Zod (client) wins when present; otherwise fall back to a server-side message.
  const errorFor = (field: keyof CreateUser): string | undefined =>
    fieldErrors[field]?.[0] ?? serverFieldErrors[field];

  const showError = (field: keyof CreateUser): string | undefined =>
    touched[field] ? errorFor(field) : undefined;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // A field being edited should drop its stale server error.
    setServerFieldErrors((prev) => ({ ...prev, [name]: undefined }));

    if (e.target instanceof HTMLSelectElement) {
      const role = Number(value);
      setValues((prev) => ({
        ...prev,
        UserRole: role as CreateUser["UserRole"],
        ...(role === USER_ROLES.Professor && { IndexNumber: "" }),
      }));
    } else {
      setValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      FirstName: true,
      LastName: true,
      Email: true,
      Password: true,
      UserRole: true,
      IndexNumber: true,
    });
    setServerError(null);

    if (!parseResult.success) return;

    setIsSubmitting(true);
    const result = await onSave(parseResult.data as CreateUser);
    if (!result.ok) {
      if (result.fieldErrors) setServerFieldErrors(result.fieldErrors);
      if (result.message) setServerError(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Create New User</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} noValidate>
          <FormAlert message={serverError} />

          <FormField id="firstName" label="First Name" error={showError("FirstName")}>
            <input
              type="text"
              className={`form-control${showError("FirstName") ? " is-invalid" : ""}`}
              id="firstName"
              name="FirstName"
              value={values.FirstName}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </FormField>

          <FormField id="lastName" label="Last Name" error={showError("LastName")}>
            <input
              type="text"
              className={`form-control${showError("LastName") ? " is-invalid" : ""}`}
              id="lastName"
              name="LastName"
              value={values.LastName}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </FormField>

          <FormField id="email" label="Email" error={showError("Email")}>
            <input
              type="email"
              className={`form-control${showError("Email") ? " is-invalid" : ""}`}
              id="email"
              name="Email"
              value={values.Email}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </FormField>

          <FormField id="password" label="Password" error={showError("Password")}>
            <PasswordInput
              id="password"
              name="Password"
              value={values.Password}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              isInvalid={!!showError("Password")}
            />
          </FormField>

          <div className="mb-3">
            <label htmlFor="userRole" className="form-label">
              Role
            </label>
            <select
              className="form-select"
              id="userRole"
              name="UserRole"
              value={values.UserRole}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value={USER_ROLES.Student}>Student</option>
              <option value={USER_ROLES.Professor}>Professor</option>
            </select>
          </div>

          {values.UserRole === USER_ROLES.Student && (
            <FormField id="indexNumber" label="Index Number" error={showError("IndexNumber")}>
              <input
                type="text"
                className={`form-control${showError("IndexNumber") ? " is-invalid" : ""}`}
                id="indexNumber"
                name="IndexNumber"
                value={values.IndexNumber || ""}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </FormField>
          )}

          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !parseResult.success}
            >
              {isSubmitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreateForm;
