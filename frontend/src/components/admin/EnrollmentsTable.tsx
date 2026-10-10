import React from "react";
import type { Enrollment } from "../../models/EnrollmentModel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faCheckCircle,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

interface EnrollmentsTableProps {
  enrollments: Enrollment[];
  onDeleteEnrollment: (enrollmentId: number) => void;
}

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
            <th>Subject</th>
            <th>Status</th>
            <th>Enrollment Date</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment) => (
            <tr key={enrollment.id}>
              <td>{enrollment.id}</td>
              <td>
                {enrollment.studentFirstName} {enrollment.studentLastName}
              </td>
              <td>{enrollment.subjectName}</td>
              <td>
                {enrollment.isDeleted ? (
                  <span className="badge bg-danger">
                    Inactive <FontAwesomeIcon icon={faBan} />
                  </span>
                ) : (
                  <span className="badge bg-success">
                    Active <FontAwesomeIcon icon={faCheckCircle} />
                  </span>
                )}
              </td>
              <td>{new Date(enrollment.enrolledAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EnrollmentsTable;
