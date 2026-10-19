import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/ui/Modal';
import type { ViewAppealModalProps } from '../../models/professor/professorDashboard';
import { acceptAppeal, denyAppeal, undoDenyAppeal } from '../../../appeals/api/appealService';
import { formatCountdown } from '../../util/gradeUtils';

function useCountdown(deadline: string | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!deadline) { setLabel(''); return; }

    const compute = () => {
      const result = formatCountdown(deadline);
      setLabel(result === 'Expired' ? 'Expired' : `${result} remaining`);
    };

    compute();
    const id = setInterval(compute, 30000);
    return () => clearInterval(id);
  }, [deadline]);

  return label;
}

const ViewAppealModal: React.FC<ViewAppealModalProps> = ({ appeal, allAppeals, open, onClose, onActionDone }) => {
  const [confirmingDeny, setConfirmingDeny] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // set when professor denies in this session; holds the reviewedAt from the response
  const [postDenyReviewedAt, setPostDenyReviewedAt] = useState<string | null>(null);

  const undoDenyDeadline: string | null = postDenyReviewedAt
    ? new Date(new Date(postDenyReviewedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : (appeal?.status === 'Denied' && appeal.canUndoDeny ? appeal.undoDenyDeadline ?? null : null);

  const countdown = useCountdown(undoDenyDeadline);

  const isUndoAvailable = undoDenyDeadline !== null && new Date(undoDenyDeadline).getTime() > Date.now();

  const history = appeal
    ? allAppeals.filter(
        a =>
          a.gradeId === appeal.gradeId &&
          a.appealId !== appeal.appealId &&
          a.status === 'Overdue'
      )
    : [];

  const handleClose = () => {
    setConfirmingDeny(false);
    setPostDenyReviewedAt(null);
    setError(null);
    onClose();
  };

  const handleAccept = async () => {
    if (!appeal) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await acceptAppeal(appeal.appealId);
      handleClose();
      onActionDone();
    } catch {
      setError('Failed to accept appeal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenyConfirm = async () => {
    if (!appeal) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await denyAppeal(appeal.appealId);
      setPostDenyReviewedAt(result.reviewedAt ?? new Date().toISOString());
      setConfirmingDeny(false);
      onActionDone();
    } catch {
      setError('Failed to deny appeal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoDeny = async () => {
    if (!appeal) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await undoDenyAppeal(appeal.appealId);
      handleClose();
      onActionDone();
    } catch {
      setError('Failed to undo denial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showUndoView = postDenyReviewedAt !== null || (appeal?.status === 'Denied' && appeal.canUndoDeny);

  const footer = (() => {
    if (!appeal) return undefined;

    if (showUndoView) {
      return isUndoAvailable ? (
        <div className="d-flex align-items-center gap-2 w-100">
          <span className="text-muted small me-auto">{countdown}</span>
          <button
            className="btn btn-outline-warning btn-sm"
            onClick={handleUndoDeny}
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="spinner-border spinner-border-sm me-1" role="status" /> : null}
            Undo deny
          </button>
        </div>
      ) : (
        <span className="text-muted small">Undo window expired.</span>
      );
    }

    if (appeal.status === 'Pending') {
      return confirmingDeny ? (
        <div className="d-flex align-items-center gap-2 w-100">
          <span className="me-auto text-danger small fw-semibold">Are you sure you want to deny this appeal?</span>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDenyConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="spinner-border spinner-border-sm me-1" role="status" /> : null}
            Confirm deny
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => { setConfirmingDeny(false); setError(null); }}
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
            {isSubmitting ? <span className="spinner-border spinner-border-sm me-1" role="status" /> : null}
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
      );
    }

    return undefined;
  })();

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Appeal"
      size="md"
      blurBackdrop
      footer={footer}
    >
      {!appeal ? null : (
        <>
          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          {history.length > 0 && (
            <div className="mb-3">
              {history.map(h => (
                <div
                  key={h.appealId}
                  className="p-2 mb-2 rounded"
                  style={{ background: '#f8f9fa', color: '#6c757d' }}
                >
                  <div className="small fw-semibold mb-1">
                    [OVERDUE] — {new Date(h.submittedAt).toLocaleDateString()}
                  </div>
                  <div className="small">{h.text}</div>
                </div>
              ))}
              <hr className="my-3" />
            </div>
          )}

          <div className="mb-1 small text-muted">
            {appeal.studentFirstName} {appeal.studentLastName} · {appeal.subjectName}
          </div>
          <div className="mb-1 small text-muted">
            Submitted: {new Date(appeal.submittedAt).toLocaleDateString()}
          </div>

          {appeal.status === 'Overdue' && (
            <div className="alert alert-warning py-1 px-2 small mb-2">
              This appeal is overdue — no action can be taken.
            </div>
          )}

          {showUndoView && (
            <div className="alert alert-warning py-1 px-2 small mb-2">
              Appeal was denied.
            </div>
          )}

          <div className="mt-2">{appeal.text}</div>
        </>
      )}
    </Modal>
  );
};

export default ViewAppealModal;
