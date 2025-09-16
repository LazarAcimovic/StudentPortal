import React from "react";
import type { Subject } from "../../models/SubjectModel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faCheckCircle,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

interface SubjectsTableProps {
  subjects: Subject[];
  onStartEdit: (subject: Subject) => void;
  // Uklonjen onDeleteSubject prop
}

const SubjectsTable: React.FC<SubjectsTableProps> = ({
  subjects,
  onStartEdit,
}) => {
  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>Naziv predmeta</th>
            <th>ECTS</th>
            <th>Profesor</th>
            <th>Status</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id}>
              <td>{subject.id}</td>
              <td>{subject.subjectName}</td>
              <td>{subject.ects}</td>
              <td>
                {subject.professorFirstName} {subject.professorLastName}
              </td>
              <td>
                {subject.isDeleted ? (
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
                  onClick={() => onStartEdit(subject)}
                >
                  <FontAwesomeIcon icon={faEdit} /> Uredi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubjectsTable;
