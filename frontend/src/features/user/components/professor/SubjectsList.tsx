import React from 'react';
import type { ProfessorSubject } from '../../../grades/models/professorDashboard';

interface Props {
  subjects: ProfessorSubject[];
  selectedSubjectId: string | null;
  onSubjectClick: (subject: ProfessorSubject) => void;
}

function SubjectItem({
  subject,
  selectedSubjectId,
  onSubjectClick,
}: {
  subject: ProfessorSubject;
  selectedSubjectId: string | null;
  onSubjectClick: (subject: ProfessorSubject) => void;
}) {
  const isActive = selectedSubjectId === subject.subjectId;
  return (
    <li
      className={`list-group-item list-group-item-action ${isActive ? 'active' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSubjectClick(subject)}
    >
      <div className="fw-semibold">{subject.subjectName}</div>
      <small className={isActive ? 'text-white-50' : 'text-muted'}>
        {subject.ects} ECTS
      </small>
    </li>
  );
}

const SubjectsList: React.FC<Props> = ({ subjects, selectedSubjectId, onSubjectClick }) => (
  <div className="col-lg-4">
    <div className="card h-100">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">My Subjects</h5>
      </div>
      <div className="card-body p-0">
        {!subjects.length ? (
          <p className="p-3 text-muted mb-0">No subjects assigned.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {subjects.map(subject => (
              <SubjectItem
                key={subject.subjectId}
                subject={subject}
                selectedSubjectId={selectedSubjectId}
                onSubjectClick={onSubjectClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

export default SubjectsList;
