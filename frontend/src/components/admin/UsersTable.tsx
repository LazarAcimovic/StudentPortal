import React from "react";
import type { User } from "../../models/UserModel";
import { RoleEnum } from "../../models/Enums";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash,
  faBan,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

interface UsersTableProps {
  users: User[];
  onDeleteUser: (userId: number) => void;
  onStartEdit: (user: User) => void; // Dodat novi prop
}

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  onDeleteUser,
  onStartEdit, // Dodat u destrukturiranju
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
                {user.userRole === RoleEnum.Student ? "Student" : ""}
                {user.userRole === RoleEnum.Professor ? "Professor" : ""}
                {user.userRole === RoleEnum.Admin ? "Admin" : ""}
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
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => onStartEdit(user)}
                >
                  <FontAwesomeIcon icon={faEdit} /> Edit
                </button>
                {/* <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onDeleteUser(user.id)}
                  disabled={user.isDeleted}
                >
                  <FontAwesomeIcon icon={faTrash} /> Obriši
                </button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;
