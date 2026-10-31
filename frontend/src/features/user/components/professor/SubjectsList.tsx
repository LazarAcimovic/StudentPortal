import React, { useState, useEffect } from 'react';
import type { ProfessorSubject } from '../../models/professor/professorDashboard';
import Pagination from '../../../../components/ui/Pagination';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 20, 50];

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

function SubjectsList({ subjects, selectedSubjectId, onSubjectClick }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (!selectedSubjectId) return;
    const idx = subjects.findIndex(s => s.subjectId === selectedSubjectId);
    if (idx === -1) return;
    const targetPage = Math.floor(idx / pageSize) + 1;
    setPage(targetPage);
  }, [selectedSubjectId, subjects, pageSize]);

  const start = (page - 1) * pageSize;
  const visibleSubjects = subjects.slice(start, start + pageSize);

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  return (
    <div className="col-lg-4">
      <div className="card h-100">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">My Subjects</h5>
        </div>
        <div className="card-body p-0">
          {!subjects.length ? (
            <p className="p-3 text-muted mb-0">No subjects assigned.</p>
          ) : (
            <>
              <ul className="list-group list-group-flush">
                {visibleSubjects.map(subject => (
                  <SubjectItem
                    key={subject.subjectId}
                    subject={subject}
                    selectedSubjectId={selectedSubjectId}
                    onSubjectClick={onSubjectClick}
                  />
                ))}
              </ul>
              <div className="p-3 pt-2">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={subjects.length}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubjectsList;
