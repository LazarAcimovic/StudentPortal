import React, { useState } from 'react';
import type { StudentDashboardSubject } from '../../models/studentDashboard';
import {
  APPEAL_DENIED_STATUS,
  APPEAL_ACCEPTED_STATUS,
  SUBJECT_ACTION_LAYOUT,
  STATUS_BADGE_MAP,
} from '../../constants/student/constants';
import type { SubjectActionLayout } from '../../constants/student/constants';
import Pagination from '../../../../components/ui/Pagination';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 20, 50];

function StatusBadge({
  status,
  appealStatus,
}: {
  status: keyof typeof STATUS_BADGE_MAP;
  appealStatus: string | null;
}) {
  return (
    <>
      {STATUS_BADGE_MAP[status]}
      {appealStatus === APPEAL_DENIED_STATUS && (
        <span className="badge rounded-pill bg-danger ms-1">Appeal denied</span>
      )}
      {appealStatus === APPEAL_ACCEPTED_STATUS && (
        <span className="badge rounded-pill bg-success ms-1">Appeal accepted</span>
      )}
    </>
  );
}

function SubjectActions({
  subject,
  layout,
  onWriteAppeal,
  onConfirmGrade,
  isConfirming,
}: {
  subject: StudentDashboardSubject;
  layout: SubjectActionLayout;
  onWriteAppeal: (enrollmentId: string) => void;
  onConfirmGrade: (enrollmentId: string) => void;
  isConfirming: boolean;
}) {
  if (!subject.canWriteAppeal && !subject.canConfirmGrade) return null;

  const wrapperClass =
    layout === SUBJECT_ACTION_LAYOUT.TABLE
      ? 'd-flex flex-column gap-1 align-items-center'
      : 'd-flex gap-2 flex-wrap';

  return (
    <div className={wrapperClass}>
      {subject.canWriteAppeal && (
        <button
          className="btn btn-warning btn-sm"
          type="button"
          onClick={() => onWriteAppeal(subject.enrollmentId)}
          disabled={isConfirming}
        >
          Write appeal
        </button>
      )}
      {subject.canConfirmGrade && (
        <button
          className="btn btn-success btn-sm"
          type="button"
          onClick={() => onConfirmGrade(subject.enrollmentId)}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
              Confirming…
            </>
          ) : (
            'Confirm grade'
          )}
        </button>
      )}
    </div>
  );
}

function SubjectItem({
  subject,
  layout,
  onWriteAppeal,
  onConfirmGrade,
  confirmingEnrollmentId,
}: {
  subject: StudentDashboardSubject;
  layout: SubjectActionLayout;
  onWriteAppeal: (enrollmentId: string) => void;
  onConfirmGrade: (enrollmentId: string) => void;
  confirmingEnrollmentId: string | null;
}) {
  const isConfirming = confirmingEnrollmentId === subject.enrollmentId;

  if (layout === SUBJECT_ACTION_LAYOUT.TABLE) {
    return (
      <tr>
        <td>{subject.subjectName}</td>
        <td>{subject.professorName}</td>
        <td>{subject.finalGrade ?? '—'}</td>
        <td>
          <StatusBadge status={subject.status} appealStatus={subject.appealStatus} />
        </td>
        <td className="text-center">
          <SubjectActions
            subject={subject}
            layout={layout}
            onWriteAppeal={onWriteAppeal}
            onConfirmGrade={onConfirmGrade}
            isConfirming={isConfirming}
          />
        </td>
      </tr>
    );
  }

  return (
    <div className="card mb-2">
      <div className="card-body">
        <div className="fw-bold mb-1">{subject.subjectName}</div>
        <div className="text-muted small mb-1">Professor: {subject.professorName}</div>
        <div className="mb-1">Final grade: {subject.finalGrade ?? '—'}</div>
        <div className="mb-2">
          <StatusBadge status={subject.status} appealStatus={subject.appealStatus} />
        </div>
        <SubjectActions
          subject={subject}
          layout={layout}
          onWriteAppeal={onWriteAppeal}
          onConfirmGrade={onConfirmGrade}
          isConfirming={isConfirming}
        />
      </div>
    </div>
  );
}

interface Props {
  subjects: StudentDashboardSubject[];
  onWriteAppeal: (enrollmentId: string) => void;
  onConfirmGrade: (enrollmentId: string) => void;
  confirmingEnrollmentId: string | null;
}

function SubjectsCard({ subjects, onWriteAppeal, onConfirmGrade, confirmingEnrollmentId }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const start = (page - 1) * pageSize;
  const visibleSubjects = subjects.slice(start, start + pageSize);

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">My Subjects</h5>
      </div>
      <div className="card-body p-0">
        {subjects.length === 0 ? (
          <div className="p-3">
            <div className="alert alert-info mb-0">
              You are not enrolled in any subjects yet.
            </div>
          </div>
        ) : (
          <>
            <div className="table-responsive d-none d-sm-block">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Professor</th>
                    <th>Final grade</th>
                    <th>Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSubjects.map(s => (
                    <SubjectItem
                      key={s.enrollmentId}
                      subject={s}
                      layout={SUBJECT_ACTION_LAYOUT.TABLE}
                      onWriteAppeal={onWriteAppeal}
                      onConfirmGrade={onConfirmGrade}
                      confirmingEnrollmentId={confirmingEnrollmentId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-sm-none p-2">
              {visibleSubjects.map(s => (
                <SubjectItem
                  key={s.enrollmentId}
                  subject={s}
                  layout={SUBJECT_ACTION_LAYOUT.CARD}
                  onWriteAppeal={onWriteAppeal}
                  onConfirmGrade={onConfirmGrade}
                  confirmingEnrollmentId={confirmingEnrollmentId}
                />
              ))}
            </div>

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
  );
}

export default SubjectsCard;
