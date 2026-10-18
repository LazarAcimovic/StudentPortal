import React from 'react';
import type { ProfessorSubject, ProfessorStudentRow } from '../../models/professor/professorDashboard';

interface Props {
  selectedSubject: ProfessorSubject | null;
  selectedStudentRow: ProfessorStudentRow | null;
  onStudentClick: (student: ProfessorStudentRow) => void;
}

function StudentItem({
  student,
  selectedStudentRow,
  onStudentClick,
}: {
  student: ProfessorStudentRow;
  selectedStudentRow: ProfessorStudentRow | null;
  onStudentClick: (student: ProfessorStudentRow) => void;
}) {
  const isActive = selectedStudentRow?.enrollmentId === student.enrollmentId;
  return (
    <li
      className={`list-group-item list-group-item-action ${isActive ? 'active' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onStudentClick(student)}
    >
      <div className="fw-semibold">
        {student.firstName} {student.lastName}
      </div>
      {student.indexNumber && (
        <small className={isActive ? 'text-white-50' : 'text-muted'}>
          {student.indexNumber}
        </small>
      )}
    </li>
  );
}

const StudentsList: React.FC<Props> = ({ selectedSubject, selectedStudentRow, onStudentClick }) => (
  <div className="col-lg-4">
    <div className="card h-100">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          {selectedSubject ? `Students in ${selectedSubject.subjectName}` : 'Students'}
        </h5>
      </div>
      <div className="card-body p-0">
        {!selectedSubject ? (
          <p className="p-3 text-muted mb-0">Select a subject to see its students.</p>
        ) : !selectedSubject.students.length ? (
          <p className="p-3 text-muted mb-0">No students enrolled in this subject.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {selectedSubject.students.map(student => (
              <StudentItem
                key={student.enrollmentId}
                student={student}
                selectedStudentRow={selectedStudentRow}
                onStudentClick={onStudentClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

export default StudentsList;
