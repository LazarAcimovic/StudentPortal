import React from 'react';
import { useStudentDashboard } from '../../features/user/hooks/useStudentDashboard';
import type { StudentDashboardSubject } from '../../features/user/models/studentDashboard';
import {
  APPEAL_DENIED_STATUS,
  SUBJECT_ACTION_LAYOUT,
  STATUS_BADGE_MAP,
} from '../../features/user/constants/constants';
import type { SubjectActionLayout } from '../../features/user/constants/constants';

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
}: {
  subject: StudentDashboardSubject;
  layout: SubjectActionLayout;
}) {
  if (!subject.canWriteAppeal && !subject.canConfirmGrade) return null;

  const wrapperClass =
    layout === SUBJECT_ACTION_LAYOUT.TABLE
      ? 'd-flex flex-column gap-1 align-items-center'
      : 'd-flex gap-2 flex-wrap';

  return (
    <div className={wrapperClass}>
      {subject.canWriteAppeal && (
        <button className="btn btn-warning btn-sm" type="button">
          Write appeal
        </button>
      )}
      {subject.canConfirmGrade && (
        <button className="btn btn-success btn-sm" type="button">
          Confirm grade
        </button>
      )}
    </div>
  );
}

function SubjectItem({
  subject,
  layout,
}: {
  subject: StudentDashboardSubject;
  layout: SubjectActionLayout;
}) {
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
          <SubjectActions subject={subject} layout={layout} />
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
        <SubjectActions subject={subject} layout={layout} />
      </div>
    </div>
  );
}

const StudentDashboardPage: React.FC = () => {
  const { data, isLoading, error } = useStudentDashboard();

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
                      <SubjectItem key={s.enrollmentId} subject={s} layout={SUBJECT_ACTION_LAYOUT.TABLE} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-sm-none p-2">
                {subjects.map((s) => (
                  <SubjectItem key={s.enrollmentId} subject={s} layout={SUBJECT_ACTION_LAYOUT.CARD} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default StudentDashboardPage;
