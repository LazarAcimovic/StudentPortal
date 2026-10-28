import { useState } from 'react';
import type { AssignedCaseAppeal, ScenarioPanelProps } from '../../models/professor/professorDashboard';
import { acceptAppeal, denyAppeal } from '../../../appeals/api/appealService';

function ScenarioBPanel({
  assignedCase,
  onSuccess,
  onError,
  onAccepted,
}: ScenarioPanelProps) {
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
      if (onAccepted) {
        onAccepted();
      } else {
        onSuccess();
      }
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

  const renderOverdueItem = (a: AssignedCaseAppeal, i: number) => (
    <div key={a.id} className="p-2 mb-2 rounded border small">
      <div className="d-flex justify-content-between mb-1">
        <span className="fw-semibold text-muted">
          [OVERDUE] Appeal {i + 1}
        </span>
        <span className="text-muted">{new Date(a.submittedAt).toLocaleDateString()}</span>
      </div>
      <div>{a.text}</div>
    </div>
  );

  return (
    <div>
      {sorted.map(renderOverdueItem)}
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

export default ScenarioBPanel;
