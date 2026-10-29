import React from "react";
import type { Enrollment } from "../../../../features/subjects/models/enrollment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

interface EnrollmentsTableProps {
  enrollments: Enrollment[];
  onDeleteEnrollment: (enrollmentId: number) => void;
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

const EnrollmentsTable: React.FC<EnrollmentsTableProps> = ({
  enrollments,
}) => {
  return (
    <>
      <div className="table-responsive d-none d-md-block">
        <table className="table table-striped table-hover align-middle">
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
                  <StatusBadge isDeleted={enrollment.isDeleted} />
                </td>
                <td>{new Date(enrollment.enrolledAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-md-none">
        {enrollments.map((enrollment) => (
          <div key={enrollment.id} className="card mb-2">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                <div className="fw-bold text-break">
                  {enrollment.studentFirstName} {enrollment.studentLastName}
                </div>
                <StatusBadge isDeleted={enrollment.isDeleted} />
              </div>
              <div className="text-break mb-1">
                Subject: {enrollment.subjectName}
              </div>
              <div className="text-muted small mb-1">
                Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
              </div>
              <div className="text-muted small">ID: {enrollment.id}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default EnrollmentsTable;
