import React, { useState } from "react";
import type { User, UpdateUser } from "../../models/UserModel";
import { RoleEnum } from "../../models/Enums";

interface UserEditFormProps {
  user: User;
  onSave: (updatedUser: UpdateUser) => void;
  onCancel: () => void;
}

const UserEditForm: React.FC<UserEditFormProps> = ({
  user,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<UpdateUser>({
    Id: user.Id,
    FirstName: user.FirstName,
    LastName: user.LastName,
    Email: user.Email,
    UserRole: user.UserRole,
    IsDeleted: user.IsDeleted,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (e.target instanceof HTMLSelectElement) {
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value),
      }));
    } else {
      // Ostali inputi (text, email, password)
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
        <h5>
          Uredi Korisnika: {user.FirstName} {user.LastName}
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="firstName" className="form-label">
              Ime
            </label>
            <input
              type="text"
              className="form-control"
              id="firstName"
              name="FirstName"
              value={formData.FirstName || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="lastName" className="form-label">
              Prezime
            </label>
            <input
              type="text"
              className="form-control"
              id="lastName"
              name="LastName"
              value={formData.LastName || ""}
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
              value={formData.Email || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="userRole" className="form-label">
              Uloga
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
              <option value={RoleEnum.Professor}>Profesor</option>
            </select>
          </div>
          <div className="mb-3 form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="isDeleted"
              name="IsDeleted"
              checked={formData.IsDeleted || false}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="isDeleted">
              Obrisan (neaktivan)
            </label>
          </div>
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
            >
              Otkaži
            </button>
            <button type="submit" className="btn btn-primary">
              Sačuvaj izmene
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditForm;
