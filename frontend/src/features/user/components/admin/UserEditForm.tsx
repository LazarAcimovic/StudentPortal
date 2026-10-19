import React, { useState } from "react";
import type { User, UpdateUser } from "../../../../models/UserModel";
import { USER_ROLES } from "../../../../shared/constants/constants";
import type { UserRole } from "../../../../shared/constants/constants";

interface UserEditFormProps {
  user: User;
  scope: "admin";
  callerRole: UserRole;
  onSave: (updatedUser: UpdateUser) => void;
  onCancel: () => void;
}

const UserEditForm: React.FC<UserEditFormProps> = ({
  user,
  callerRole,
  onSave,
  onCancel,
}) => {
  const isTargetAdmin = user.userRole === USER_ROLES.Admin;
  const isTargetStudent = user.userRole === USER_ROLES.Student;

  const [formData, setFormData] = useState<UpdateUser>({
    Id: user.id,
    FirstName: user.firstName,
    LastName: user.lastName,
    Email: user.email,
    UserRole: user.userRole,
    IsDeleted: user.isDeleted,
    IndexNumber: user.indexNumber ?? "",
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
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form id="user-edit-form" onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="edit-firstName" className="form-label">
          First Name
        </label>
        <input
          type="text"
          className="form-control"
          id="edit-firstName"
          name="FirstName"
          value={formData.FirstName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="edit-lastName" className="form-label">
          Last Name
        </label>
        <input
          type="text"
          className="form-control"
          id="edit-lastName"
          name="LastName"
          value={formData.LastName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="edit-email" className="form-label">
          Email
        </label>
        <input
          type="email"
          className="form-control"
          id="edit-email"
          name="Email"
          value={formData.Email}
          onChange={handleChange}
          required
        />
      </div>
      {isTargetStudent && (
        <div className="mb-3">
          <label htmlFor="edit-indexNumber" className="form-label">
            Index Number
          </label>
          <input
            type="text"
            className="form-control"
            id="edit-indexNumber"
            name="IndexNumber"
            value={formData.IndexNumber ?? ""}
            onChange={handleChange}
          />
        </div>
      )}
      {!isTargetAdmin && (
        <div className="mb-3">
          <label htmlFor="edit-userRole" className="form-label">
            Role
          </label>
          <select
            className="form-select"
            id="edit-userRole"
            name="UserRole"
            value={formData.UserRole}
            onChange={handleChange}
            required
          >
            <option value={USER_ROLES.Student}>Student</option>
            <option value={USER_ROLES.Professor}>Professor</option>
          </select>
        </div>
      )}
      {!isTargetAdmin && (
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="edit-isDeleted"
            name="IsDeleted"
            checked={formData.IsDeleted}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="edit-isDeleted">
            Inactive
          </label>
        </div>
      )}
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default UserEditForm;
