import { useState, useEffect } from 'react';
import Modal from '../../../../components/ui/Modal';
import { useEligibleProfessors } from '../../../escalations/hooks/useEligibleProfessors';
import { assign, reassign } from '../../../escalations/api/escalationService';
import { REASON_LABEL } from './EscalationsTable';
import { formatDate } from '../../utils/dateUtils';
import type {
  EscalatedCase,
  EscalationStatus,
  AssignmentHistoryEntry,
  EscalationAppeal,
} from '../../../escalations/models/escalation';

function assignmentOutcome(entry: AssignmentHistoryEntry, escalationStatus: EscalationStatus): string {
  if (entry.supersededAt !== null) {
    return `Superseded ${formatDate(entry.supersededAt)}`;
  }
  return escalationStatus === 'Resolved' ? 'Resolved' : 'Active';
}

function AppealHistorySection({ appeals }: { appeals: EscalationAppeal[] }) {
  if (!appeals.length) return null;
  return (
    <div className="mb-3">
      <h6 className="fw-semibold mb-2">Appeal History</h6>
      {appeals.map((a, i) => (
        <blockquote key={a.id} className="blockquote border-start border-2 ps-3 mb-2">
          <p className="mb-1 small">{a.text}</p>
          <footer className="blockquote-footer small">
            Appeal {i + 1} · {a.status} · {formatDate(a.submittedAt)}
          </footer>
        </blockquote>
      ))}
    </div>
  );
}

function AssignmentHistorySection({
  history,
  escalationStatus,
}: {
  history: AssignmentHistoryEntry[];
  escalationStatus: EscalationStatus;
}) {
  if (!history.length) return null;
  return (
    <div className="mb-3">
      <h6 className="fw-semibold mb-2">Assignment History</h6>
      <table className="table table-sm table-bordered small mb-0">
        <thead>
          <tr>
            <th>Professor</th>
            <th>Assigned by</th>
            <th>Assigned at</th>
            <th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => (
            <tr key={i}>
              <td>{entry.assignedProfessorName}</td>
              <td>{entry.assignedByAdminName}</td>
              <td>{formatDate(entry.assignedAt)}</td>
              <td>{assignmentOutcome(entry, escalationStatus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type AssignModalProps = {
  escalatedCase: EscalatedCase | null;
  open: boolean;
  onClose: () => void;
  onConfirmed: (updated: EscalatedCase) => void;
};

export function AssignModal({ escalatedCase, open, onClose, onConfirmed }: AssignModalProps) {
  const { professors, isLoading: loadingProfs, error: profsError, loadProfessors } = useEligibleProfessors();
  const [selectedProfessorId, setSelectedProfessorId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isReassign = escalatedCase?.escalationStatus === 'NeedsReassignment';
  const title = isReassign ? 'Reassign professor' : 'Assign professor';

  useEffect(() => {
    if (!open || !escalatedCase) return;

    const controller = new AbortController();
    setSelectedProfessorId('');
    setSubmitError(null);

    void loadProfessors(escalatedCase.gradeId, controller.signal);

    return () => controller.abort();
    // escalatedCase.gradeId is a string (primitive) — safe as an effect dependency (D-033)
  }, [open, escalatedCase, loadProfessors]);

  const handleClose = () => {
    setSelectedProfessorId('');
    setSubmitError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!escalatedCase || !selectedProfessorId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updated = isReassign
        ? await reassign(escalatedCase.gradeId, selectedProfessorId)
        : await assign(escalatedCase.gradeId, selectedProfessorId);
      onConfirmed(updated);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg" blurBackdrop>
      {escalatedCase && (
        <>
          {submitError && <div className="alert alert-danger py-2 mb-3 small">{submitError}</div>}

          <div className="mb-3 small">
            <div className="fw-semibold">
              {escalatedCase.subjectName}
              {escalatedCase.subjectCode && (
                <span className="text-muted fw-normal"> ({escalatedCase.subjectCode})</span>
              )}
            </div>
            <div>
              Student: {escalatedCase.studentFirstName} {escalatedCase.studentLastName}
            </div>
            <div>Grade: <strong>{escalatedCase.finalGrade}</strong></div>
            <div className="mt-1">
              <span className="badge bg-secondary text-wrap text-start">
                {REASON_LABEL[escalatedCase.reason] ?? escalatedCase.reason}
              </span>
            </div>
          </div>

          <AppealHistorySection appeals={escalatedCase.appeals} />
          <AssignmentHistorySection
            history={escalatedCase.assignmentHistory}
            escalationStatus={escalatedCase.escalationStatus}
          />

          <div className="mb-3">
            <h6 className="fw-semibold mb-2">Eligible professors</h6>
            {loadingProfs ? (
              <div className="text-center py-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading professors" />
              </div>
            ) : profsError ? (
              <p className="text-danger small">{profsError.message}</p>
            ) : professors.length === 0 ? (
              <p className="text-muted small mb-0">No eligible professors available.</p>
            ) : (
              <ul className="list-group">
                {professors.map((prof) => (
                  <li
                    key={prof.id}
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${
                      selectedProfessorId === prof.id ? 'active' : ''
                    }`}
                    onClick={() => setSelectedProfessorId(prof.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="radio"
                      name="eligible-professor"
                      value={prof.id}
                      checked={selectedProfessorId === prof.id}
                      onChange={() => setSelectedProfessorId(prof.id)}
                      aria-label={`${prof.firstName} ${prof.lastName}`}
                      className="form-check-input mt-0"
                    />
                    <span>
                      {prof.firstName} {prof.lastName}
                      <span className="text-muted small ms-2">{prof.email}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              disabled={
                isSubmitting ||
                loadingProfs ||
                professors.length === 0 ||
                !selectedProfessorId
              }
            >
              {isSubmitting ? (
                <><span className="spinner-border spinner-border-sm me-1" role="status" />Saving…</>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
