import React from "react";
// Proverite da li je ova putanja ispravna, po vašem fajlu
import type { Enrollment } from "../../models/EnrollmentModel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faCheckCircle,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

// **OVDE JE BILA GREŠKA!**
// Morate eksplicitno definisati interfejs za propsove.
interface EnrollmentsTableProps {
  enrollments: Enrollment[];
  onDeleteEnrollment: (enrollmentId: number) => void;
}

// Komponenta prima props kao argument sa definisanim tipom
const EnrollmentsTable: React.FC<EnrollmentsTableProps> = ({
  enrollments,
  onDeleteEnrollment,
}) => {
  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>Student</th>
            <th>Predmet</th>
            <th>Status</th>
            <th>Datum upisa</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment) => (
            <tr key={enrollment.Id}>
              <td>{enrollment.Id}</td>
              <td>
                {enrollment.StudentFirstName} {enrollment.StudentLastName}
              </td>
              <td>{enrollment.SubjectName}</td>
              <td>
                {enrollment.IsDeleted ? (
                  <span className="badge bg-danger">
                    Obrisan <FontAwesomeIcon icon={faBan} />
                  </span>
                ) : (
                  <span className="badge bg-success">
                    Aktivan <FontAwesomeIcon icon={faCheckCircle} />
                  </span>
                )}
              </td>
              <td>{new Date(enrollment.EnrolledAt).toLocaleDateString()}</td>
              <td>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onDeleteEnrollment(enrollment.Id)}
                  disabled={enrollment.IsDeleted}
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

export default EnrollmentsTable;
