import React from 'react';
import Pagination from '../../../../components/ui/Pagination';
import type { ProfessorStudentRow } from '../../models/professor/professorDashboard';

interface Props {
  subjectName: string | null;
  students: ProfessorStudentRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  isLoading: boolean;
  selectedStudentRow: ProfessorStudentRow | null;
  onStudentClick: (student: ProfessorStudentRow) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
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

const StudentsList: React.FC<Props> = ({
  subjectName,
  students,
  totalCount,
  page,
  pageSize,
  pageSizeOptions,
  isLoading,
  selectedStudentRow,
  onStudentClick,
  onPageChange,
  onPageSizeChange,
}) => (
  <div className="col-12 col-sm-6 col-lg-4">
    <div className="card h-100">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          {subjectName ? `Students in ${subjectName}` : 'Students'}
        </h5>
      </div>
      <div className="card-body p-0">
        {!subjectName ? (
          <p className="p-3 text-muted mb-0">Select a subject to see its students.</p>
        ) : isLoading ? (
          <div className="p-3 text-center">
            <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading students" />
          </div>
        ) : students.length === 0 ? (
          <p className="p-3 text-muted mb-0">No students enrolled in this subject.</p>
        ) : (
          <>
            <ul className="list-group list-group-flush">
              {students.map(student => (
                <StudentItem
                  key={student.enrollmentId}
                  student={student}
                  selectedStudentRow={selectedStudentRow}
                  onStudentClick={onStudentClick}
                />
              ))}
            </ul>
            {totalCount >= 1 && (
              <div className="p-2 border-top">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={totalCount}
                  pageSizeOptions={[...pageSizeOptions]}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
);

export default StudentsList;
