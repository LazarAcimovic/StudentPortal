import React, { useState } from "react";
import type { CreateUser } from "../../models/UserModel";
import { RoleEnum } from "../../models/Enums";

interface UserCreateFormProps {
  onSave: (newUser: CreateUser) => void;
  onCancel: () => void;
}

const UserCreateForm: React.FC<UserCreateFormProps> = ({
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateUser>({
    FirstName: "",
    LastName: "",
    Email: "",
    Password: "",
    UserRole: RoleEnum.Student,
    IndexNumber: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (e.target instanceof HTMLSelectElement) {
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value),
        ...(Number(value) === RoleEnum.Professor && { IndexNumber: undefined }),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="card my-4">
      <div className="card-header">
        <h5>Create New User</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="firstName" className="form-label">
              First Name
            </label>
            <input
              type="text"
              className="form-control"
              id="firstName"
              name="FirstName"
              value={formData.FirstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="lastName" className="form-label">
              Last Name
            </label>
            <input
              type="text"
              className="form-control"
              id="lastName"
              name="LastName"
              value={formData.LastName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="Email"
              value={formData.Email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="Password"
              value={formData.Password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="userRole" className="form-label">
              Role
            </label>
            <select
              className="form-select"
              id="userRole"
              name="UserRole"
              value={formData.UserRole}
              onChange={handleChange}
              required
            >
              <option value={RoleEnum.Student}>Student</option>
              <option value={RoleEnum.Professor}>Professor</option>
            </select>
          </div>

          {formData.UserRole === RoleEnum.Student && (
            <div className="mb-3">
              <label htmlFor="indexNumber" className="form-label">
                Index Number
              </label>
              <input
                type="text"
                className="form-control"
                id="indexNumber"
                name="IndexNumber"
                value={formData.IndexNumber || ""}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreateForm;
