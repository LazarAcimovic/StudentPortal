import React from "react";
import type { Subject } from "../../../../features/subjects/models/subject";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faCheckCircle,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

interface SubjectsTableProps {
  subjects: Subject[];
  onStartEdit: (subject: Subject) => void;
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

const SubjectsTable: React.FC<SubjectsTableProps> = ({
  subjects,
  onStartEdit,
}) => {
  return (
    <>
      <div className="table-responsive d-none d-md-block">
        <table className="table table-striped table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject Name</th>
              <th>Subject Code</th>
              <th>ECTS</th>
              <th>Professor</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>{subject.id}</td>
                <td>{subject.subjectName}</td>
                <td>{subject.subjectCode}</td>
                <td>{subject.ects}</td>
                <td>
                  {subject.professorFirstName} {subject.professorLastName}
                </td>
                <td>
                  <StatusBadge isDeleted={subject.isDeleted} />
                </td>
                <td>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => onStartEdit(subject)}
                  >
                    <FontAwesomeIcon icon={faEdit} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-md-none">
        {subjects.map((subject) => (
          <div key={subject.id} className="card mb-2">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                <div className="fw-bold text-break">{subject.subjectName}</div>
                <StatusBadge isDeleted={subject.isDeleted} />
              </div>
              <div className="text-muted small mb-1">
                Subject Code: {subject.subjectCode}
              </div>
              <div className="text-muted small mb-1">
                Professor: {subject.professorFirstName}{" "}
                {subject.professorLastName}
              </div>
              <div className="text-muted small mb-1">ECTS: {subject.ects}</div>
              <div className="text-muted small mb-2">ID: {subject.id}</div>
              <button
                className="btn btn-warning btn-sm w-100"
                onClick={() => onStartEdit(subject)}
              >
                <FontAwesomeIcon icon={faEdit} /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default SubjectsTable;
