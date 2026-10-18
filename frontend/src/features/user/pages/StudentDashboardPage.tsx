import React, { useState } from 'react';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import type { StudentDashboardSubject } from '../models/studentDashboard';
import {
  APPEAL_DENIED_STATUS,
  APPEAL_MAX_LENGTH,
  APPEAL_MODAL_INITIAL_STATE,
  APPEAL_SUBMIT_ERROR,
  APPEAL_TEXT_REQUIRED_ERROR,
  CONFIRM_GRADE_MODAL_INITIAL_STATE,
  SUBJECT_ACTION_LAYOUT,
  STATUS_BADGE_MAP,
} from '../constants/student/constants';
import type { SubjectActionLayout } from '../constants/student/constants';
import Modal from '../../../components/ui/Modal';
import { submitAppeal } from '../../appeals/api/appealService';
import { studentConfirmGrade } from '../../grades/api/gradeService';

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

interface AppealModalState {
  enrollmentId: string;
  text: string;
  isSubmitting: boolean;
  error: string | null;
}

interface ConfirmGradeModalState {
  enrollmentId: string;
  isSubmitting: boolean;
}

const StudentDashboardPage: React.FC = () => {
  const { data, isLoading, error, refresh } = useStudentDashboard();
  const [appealModal, setAppealModal] = useState<AppealModalState | null>(APPEAL_MODAL_INITIAL_STATE);
  const [confirmGradeModal, setConfirmGradeModal] = useState<ConfirmGradeModalState | null>(CONFIRM_GRADE_MODAL_INITIAL_STATE);

  const openAppealModal = (enrollmentId: string) => {
    setAppealModal({ enrollmentId, text: '', isSubmitting: false, error: null });
  };

  const closeAppealModal = () => {
    if (appealModal?.isSubmitting) return;
    setAppealModal(APPEAL_MODAL_INITIAL_STATE);
  };

  const openConfirmGradeModal = (enrollmentId: string) => {
    setConfirmGradeModal({ enrollmentId, isSubmitting: false });
  };

  const closeConfirmGradeModal = () => {
    if (confirmGradeModal?.isSubmitting) return;
    setConfirmGradeModal(CONFIRM_GRADE_MODAL_INITIAL_STATE);
  };

  const handleConfirmGrade = async () => {
    if (!confirmGradeModal || confirmGradeModal.isSubmitting) return;
    setConfirmGradeModal({ ...confirmGradeModal, isSubmitting: true });
    try {
      await studentConfirmGrade({ enrollmentId: confirmGradeModal.enrollmentId });
      setConfirmGradeModal(CONFIRM_GRADE_MODAL_INITIAL_STATE);
      refresh();
    } finally {
      setConfirmGradeModal((prev) => prev ? { ...prev, isSubmitting: false } : null);
    }
  };

  const handleAppealTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!appealModal) return;
    setAppealModal({ ...appealModal, text: e.target.value });
  };

  const handleAppealSubmit = async () => {
    if (!appealModal || appealModal.isSubmitting) return;

    const text = appealModal.text.trim();
    if (!text) {
      setAppealModal({ ...appealModal, error: APPEAL_TEXT_REQUIRED_ERROR });
      return;
    }

    setAppealModal({ ...appealModal, isSubmitting: true, error: null });

    try {
      await submitAppeal({ enrollmentId: appealModal.enrollmentId, text });
      setAppealModal(APPEAL_MODAL_INITIAL_STATE);
      refresh();
    } catch {
      setAppealModal((prev) =>
        prev ? { ...prev, isSubmitting: false, error: APPEAL_SUBMIT_ERROR } : null
      );
    }
  };

  if (isLoading) {
    return (
      <main className="container my-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container my-4">
        <div className="alert alert-danger">{error}</div>
      </main>
    );
  }

  if (!data) return null;

  const { profile, stats, subjects } = data;

  const appealCharsLeft = appealModal ? APPEAL_MAX_LENGTH - appealModal.text.length : 0;

  return (
    <main className="container my-4">
      <h1 className="mb-2">Student Dashboard</h1>
      <p className="mb-4">
        Hello, {profile.firstName} {profile.lastName}!
      </p>

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">My Information</h5>
        </div>
        <div className="card-body">
          <p className="mb-1">
            <span className="fw-bold">Name:</span> {profile.firstName} {profile.lastName}
          </p>
          <p className="mb-1">
            <span className="fw-bold">Email:</span> {profile.email}
          </p>
          <p className="mb-0">
            <span className="fw-bold">Index number:</span>{' '}
            {profile.indexNumber ?? '—'}
          </p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">Study Statistics</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-md-3">
              <div className="p-3 border rounded text-center">
                <div className="text-muted small mb-1">Average Grade</div>
                <h2 className="fw-bold text-success mb-0">
                  {stats.averageGrade.toFixed(1)}
                </h2>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <div className="p-3 border rounded text-center">
                <div className="text-muted small mb-1">Passed Exams</div>
                <h2 className="fw-bold text-primary mb-0">
                  {stats.passedExams}
                </h2>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <div className="p-3 border rounded text-center">
                <div className="text-muted small mb-1">Non-passed Exams</div>
                <h2 className="fw-bold text-danger mb-0">
                  {stats.nonPassedExams}
                </h2>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <div className="p-3 border rounded text-center">
                <div className="text-muted small mb-1">Earned ECTS</div>
                <h2 className="fw-bold text-info mb-0">{stats.earnedEcts}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    {subjects.map((s) => (
                      <SubjectItem
                        key={s.enrollmentId}
                        subject={s}
                        layout={SUBJECT_ACTION_LAYOUT.TABLE}
                        onWriteAppeal={openAppealModal}
                        onConfirmGrade={openConfirmGradeModal}
                        confirmingEnrollmentId={confirmGradeModal?.isSubmitting ? confirmGradeModal.enrollmentId : null}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-sm-none p-2">
                {subjects.map((s) => (
                  <SubjectItem
                    key={s.enrollmentId}
                    subject={s}
                    layout={SUBJECT_ACTION_LAYOUT.CARD}
                    onWriteAppeal={openAppealModal}
                    onConfirmGrade={openConfirmGradeModal}
                    confirmingEnrollmentId={confirmGradeModal?.isSubmitting ? confirmGradeModal.enrollmentId : null}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={confirmGradeModal !== null}
        onClose={closeConfirmGradeModal}
        title="Confirm grade"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeConfirmGradeModal}
              disabled={confirmGradeModal?.isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleConfirmGrade}
              disabled={confirmGradeModal?.isSubmitting}
            >
              {confirmGradeModal?.isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Confirming…
                </>
              ) : (
                'Yes, confirm'
              )}
            </button>
          </>
        }
      >
        <p className="mb-0">Are you sure you want to confirm this grade? This action cannot be undone.</p>
      </Modal>

      <Modal
        open={appealModal !== null}
        onClose={closeAppealModal}
        title="Write Appeal"
        blurBackdrop
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeAppealModal}
              disabled={appealModal?.isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleAppealSubmit}
              disabled={appealModal?.isSubmitting || !appealModal?.text.trim()}
            >
              {appealModal?.isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                'Submit appeal'
              )}
            </button>
          </>
        }
      >
        {appealModal && (
          <>
            {appealModal.error && (
              <div className="alert alert-danger py-2">{appealModal.error}</div>
            )}
            <label htmlFor="appeal-text" className="form-label">
              Describe your appeal
            </label>
            <textarea
              id="appeal-text"
              className="form-control"
              rows={5}
              maxLength={APPEAL_MAX_LENGTH}
              value={appealModal.text}
              onChange={handleAppealTextChange}
              disabled={appealModal.isSubmitting}
              placeholder="Explain why you are appealing this grade…"
            />
            <div className={`form-text text-end ${appealCharsLeft < 100 ? 'text-warning' : ''}`}>
              {appealCharsLeft} characters remaining
            </div>
          </>
        )}
      </Modal>
    </main>
  );
};

export default StudentDashboardPage;
