import React from "react";
import type { User } from "../../../../models/UserModel";
import { USER_ROLES } from "../../../../shared/constants/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faBan,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

interface UsersTableProps {
  users: User[];
  currentUserId: number;
  onDeleteUser: (userId: number) => void;
  onStartEdit: (user: User) => void;
}

function roleLabel(role: number): string {
  if (role === USER_ROLES.Student) return "Student";
  if (role === USER_ROLES.Professor) return "Professor";
  if (role === USER_ROLES.Admin) return "Admin";
  return "";
}

function StatusBadge({ isDeleted }: { isDeleted: boolean }) {
  return isDeleted ? (
    <span className="badge bg-danger">
      Inactive <FontAwesomeIcon icon={faBan} />
    </span>
  ) : (
    <span className="badge bg-success">
      Active <FontAwesomeIcon icon={faCheckCircle} />
    </span>
  );
}

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  currentUserId,
  onStartEdit,
}) => {
  return (
    <>
      <div className="table-responsive d-none d-md-block">
        <table className="table table-striped table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td className="text-break">{user.email}</td>
                <td>{roleLabel(user.userRole)}</td>
                <td>
                  <StatusBadge isDeleted={user.isDeleted} />
                </td>
                <td>
                  {user.id !== currentUserId && (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => onStartEdit(user)}
                    >
                      <FontAwesomeIcon icon={faEdit} /> Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-md-none">
        {users.map((user) => (
          <div key={user.id} className="card mb-2">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                <div className="fw-bold text-break">
                  {user.firstName} {user.lastName}
                </div>
                <StatusBadge isDeleted={user.isDeleted} />
              </div>
              <div className="text-break small mb-1">{user.email}</div>
              <div className="text-muted small mb-1">
                Role: {roleLabel(user.userRole)}
              </div>
              <div className="text-muted small mb-2">ID: {user.id}</div>
              {user.id !== currentUserId && (
                <button
                  className="btn btn-warning btn-sm w-100"
                  onClick={() => onStartEdit(user)}
                >
                  <FontAwesomeIcon icon={faEdit} /> Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default UsersTable;
