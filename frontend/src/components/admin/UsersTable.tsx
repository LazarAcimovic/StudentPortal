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
            <th>Ime</th>
            <th>Prezime</th>
            <th>Email</th>
            <th>Uloga</th>
            <th>Status</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.Id}>
              <td>{user.Id}</td>
              <td>{user.FirstName}</td>
              <td>{user.LastName}</td>
              <td>{user.Email}</td>
              <td>
                {user.UserRole === RoleEnum.Student ? "Student" : ""}
                {user.UserRole === RoleEnum.Professor ? "Profesor" : ""}
              </td>
              <td>
                {user.IsDeleted ? (
                  <span className="badge bg-danger">
                    Obrisan <FontAwesomeIcon icon={faBan} />
                  </span>
                ) : (
                  <span className="badge bg-success">
                    Aktivan <FontAwesomeIcon icon={faCheckCircle} />
                  </span>
                )}
              </td>
              <td>
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => onStartEdit(user)}
                >
                  <FontAwesomeIcon icon={faEdit} /> Uredi
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onDeleteUser(user.Id)}
                  disabled={user.IsDeleted}
                >
                  <FontAwesomeIcon icon={faTrash} /> Obriši
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;
