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

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  currentUserId,
  onDeleteUser,
  onStartEdit,
}) => {
  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
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
              <td>{user.email}</td>
              <td>
                {user.userRole === USER_ROLES.Student && "Student"}
                {user.userRole === USER_ROLES.Professor && "Professor"}
                {user.userRole === USER_ROLES.Admin && "Admin"}
              </td>
              <td>
                {user.isDeleted ? (
                  <span className="badge bg-danger">
                    Inactive <FontAwesomeIcon icon={faBan} />
                  </span>
                ) : (
                  <span className="badge bg-success">
                    Active <FontAwesomeIcon icon={faCheckCircle} />
                  </span>
                )}
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
  );
};

export default UsersTable;
