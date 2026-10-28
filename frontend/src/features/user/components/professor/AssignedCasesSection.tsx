import React, { useState } from 'react';
import type { AssignedCase, AssignedCaseAppeal } from '../../models/professor/professorDashboard';
import Modal from '../../../../components/ui/Modal';
import { professorReconfirmExam } from '../../../grades/api/gradeService';
import { acceptAppeal, denyAppeal } from '../../../appeals/api/appealService';

const REASON_LABEL: Record<string, string> = {
  AcceptedUnresolved: 'Accepted appeal — awaiting re-grade',
  ChainExhausted: 'Two overdue appeals — awaiting review',
};

function AppealHistory({ appeals }: { appeals: AssignedCaseAppeal[] }) {
  if (!appeals.length) return null;
  return (
    <div className="mb-3">
      <h6 className="fw-semibold mb-2">Appeal History</h6>
      {appeals.map((a, i) => (
        <div key={a.id} className="p-2 mb-2 rounded border small">
          <div className="d-flex justify-content-between mb-1">
            <span className="fw-semibold">Appeal {i + 1}</span>
            <span className="text-muted">{new Date(a.submittedAt).toLocaleDateString()}</span>
          </div>
          <div className="text-muted mb-1">Status: {a.status}</div>
          <div>{a.text}</div>
        </div>
      ))}
    </div>
  );
}

function ScenarioAPanel({
  assignedCase,
  onSuccess,
  onError,
}: {
  assignedCase: AssignedCase;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [exam, setExam] = useState(String(assignedCase.examPoints));
  const [isConfirming, setIsConfirming] = useState(false);

  const fixedSum =
    assignedCase.midterm1Points +
    assignedCase.midterm2Points +
    assignedCase.attendancePoints +
    assignedCase.practicalPoints;

  const examVal = parseFloat(exam);
  const isValid = !isNaN(examVal) && examVal >= 0 && examVal <= 30;

  const total = isValid ? fixedSum + examVal : null;
  const liveGrade = total === null ? null
    : total <= 50 ? 5
    : total <= 60 ? 6
    : total <= 70 ? 7
    : total <= 80 ? 8
    : total <= 90 ? 9
    : 10;

  const handleConfirm = async () => {
    if (!isValid) return;
    setIsConfirming(true);
    try {
      await professorReconfirmExam({ enrollmentId: assignedCase.enrollmentId, examPoints: examVal });
      onSuccess();
    } catch {
      onError('Failed to confirm grade. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div>
      <div className="alert alert-secondary py-2 mb-3 small">
        Midterms: {(assignedCase.midterm1Points + assignedCase.midterm2Points).toFixed(1)}/60
        {' • '}
        Attendance: {assignedCase.attendancePoints.toFixed(1)}/5
        {' • '}
        Practical: {assignedCase.practicalPoints.toFixed(1)}/5
      </div>
      <div className="mb-3">
        <label className="form-label small mb-1">
          Exam <span className="text-muted">(max 30)</span>
        </label>
        <input
          type="number"
          className="form-control form-control-sm"
          min={0}
          max={30}
          step={0.5}
          value={exam}
          onChange={e => setExam(e.target.value)}
        />
      </div>
      {liveGrade !== null && (
        <p className="small mb-3">
          Final grade: <strong>{liveGrade}</strong>
        </p>
      )}
      <button
        className="btn btn-success btn-sm"
        onClick={handleConfirm}
        disabled={!isValid || isConfirming}
      >
        {isConfirming ? (
          <><span className="spinner-border spinner-border-sm me-1" role="status" />Confirming…</>
        ) : (
          'Confirm'
        )}
      </button>
    </div>
  );
}

function ScenarioBPanel({
  assignedCase,
  onSuccess,
  onError,
}: {
  assignedCase: AssignedCase;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [confirmingDeny, setConfirmingDeny] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The latest appeal (highest index) is the actionable one
  const sorted = [...assignedCase.appeals].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );
  const latest = sorted[sorted.length - 1];

  if (!latest) return <p className="text-muted small">No appeals found.</p>;

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await acceptAppeal(latest.id);
      onSuccess();
    } catch {
      onError('Failed to accept appeal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenyConfirm = async () => {
    setIsSubmitting(true);
    try {
      await denyAppeal(latest.id);
      onSuccess();
    } catch {
      onError('Failed to deny appeal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {sorted.map((a, i) => (
        <div key={a.id} className="p-2 mb-2 rounded border small">
          <div className="d-flex justify-content-between mb-1">
            <span className="fw-semibold text-muted">
              [OVERDUE] Appeal {i + 1}
            </span>
            <span className="text-muted">{new Date(a.submittedAt).toLocaleDateString()}</span>
          </div>
          <div>{a.text}</div>
        </div>
      ))}
      <div className="mt-3">
        {confirmingDeny ? (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-danger small fw-semibold me-auto">
              Are you sure you want to deny this appeal?
            </span>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDenyConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" />
              ) : null}
              Confirm deny
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setConfirmingDeny(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="d-flex gap-2">
            <button
              className="btn btn-success btn-sm"
              onClick={handleAccept}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" />
              ) : null}
              Accept
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmingDeny(true)}
              disabled={isSubmitting}
            >
              Deny
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResolveModal({
  assignedCase,
  open,
  onClose,
  onResolved,
}: {
  assignedCase: AssignedCase | null;
  open: boolean;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = () => {
    setError(null);
    onClose();
    onResolved();
  };

  const handleError = (msg: string) => setError(msg);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Resolve Assigned Case"
      size="lg"
      blurBackdrop
    >
      {assignedCase && (
        <>
          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <div className="mb-3 small text-muted">
            <strong>{assignedCase.subjectName}</strong>
            {' — '}
            {assignedCase.studentFirstName} {assignedCase.studentLastName}
            {' · '}
            Final grade: <strong>{assignedCase.finalGrade}</strong>
          </div>

          <div className="mb-3">
            <span className="badge bg-warning text-dark">
              {REASON_LABEL[assignedCase.reason] ?? assignedCase.reason}
            </span>
          </div>

          <AppealHistory appeals={assignedCase.appeals} />

          <hr className="my-3" />

          {assignedCase.reason === 'AcceptedUnresolved' ? (
            <ScenarioAPanel
              assignedCase={assignedCase}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          ) : (
            <ScenarioBPanel
              assignedCase={assignedCase}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          )}
        </>
      )}
    </Modal>
  );
}

function AssignedCaseItem({
  assignedCase,
  layout,
  onResolveClick,
}: {
  assignedCase: AssignedCase;
  layout: 'table' | 'card';
  onResolveClick: (c: AssignedCase) => void;
}) {
  const reasonLabel = REASON_LABEL[assignedCase.reason] ?? assignedCase.reason;

  if (layout === 'table') {
    return (
      <tr>
        <td>{assignedCase.subjectName}</td>
        <td>
          {assignedCase.studentFirstName} {assignedCase.studentLastName}
        </td>
        <td>{assignedCase.finalGrade}</td>
        <td>
          <span className="badge bg-warning text-dark text-wrap text-start">{reasonLabel}</span>
        </td>
        <td className="text-end">
          <button
            className="btn btn-outline-primary btn-sm text-nowrap"
            onClick={() => onResolveClick(assignedCase)}
          >
            Resolve
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className="card mb-2">
      <div className="card-body">
        <div className="fw-bold">{assignedCase.subjectName}</div>
        <div className="text-muted small">
          {assignedCase.studentFirstName} {assignedCase.studentLastName}
        </div>
        <div className="my-1">
          <span className="badge bg-warning text-dark">{reasonLabel}</span>
        </div>
        <div className="text-muted small mb-2">Grade: {assignedCase.finalGrade}</div>
        <button
          className="btn btn-outline-primary btn-sm w-100"
          onClick={() => onResolveClick(assignedCase)}
        >
          Resolve
        </button>
      </div>
    </div>
  );
}

interface AssignedCasesSectionProps {
  assignedCases: AssignedCase[];
  onRefresh: () => void;
}

const AssignedCasesSection: React.FC<AssignedCasesSectionProps> = ({ assignedCases, onRefresh }) => {
  const [selectedCase, setSelectedCase] = useState<AssignedCase | null>(null);

  return (
    <>
      <div className="card mt-4">
        <div className="card-header bg-warning text-dark">
          <h5 className="mb-0">Assigned Cases</h5>
        </div>
        <div className="card-body p-0">
          {!assignedCases.length ? (
            <p className="p-3 text-muted mb-0">No assigned cases.</p>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <div className="table-responsive d-none d-sm-block">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <tr>
                      <th>Subject</th>
                      <th>Student</th>
                      <th>Grade</th>
                      <th>Reason</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedCases.map(c => (
                      <AssignedCaseItem
                        key={c.gradeId}
                        assignedCase={c}
                        layout="table"
                        onResolveClick={setSelectedCase}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-sm-none p-2">
                {assignedCases.map(c => (
                  <AssignedCaseItem
                    key={c.gradeId}
                    assignedCase={c}
                    layout="card"
                    onResolveClick={setSelectedCase}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ResolveModal
        assignedCase={selectedCase}
        open={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        onResolved={() => {
          setSelectedCase(null);
          onRefresh();
        }}
      />
    </>
  );
};

export default AssignedCasesSection;
