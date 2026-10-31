import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/ui/Modal';
import Pagination from '../../../../components/ui/Pagination';
import { useEscalations } from '../../../escalations/hooks/useEscalations';
import { useEligibleProfessors } from '../../../escalations/hooks/useEligibleProfessors';
import { assign, reassign } from '../../../escalations/api/escalationService';

const PAGE_SIZE_OPTIONS = [15, 20, 50];
import type {
  EscalatedCase,
  EscalationStatus,
  EscalationReason,
  AssignmentHistoryEntry,
  EscalationAppeal,
} from '../../../escalations/models/escalation';
import { formatDate } from '../../utils/dateUtils';

const STATUS_BADGE: Record<EscalationStatus, string> = {
  NeedsAssignment: 'badge rounded-pill bg-danger',
  Assigned: 'badge rounded-pill bg-info text-dark',
  NeedsReassignment: 'badge rounded-pill bg-warning text-dark',
  Resolved: 'badge rounded-pill bg-success',
};

const STATUS_LABEL: Record<EscalationStatus, string> = {
  NeedsAssignment: 'Needs assignment',
  Assigned: 'Assigned',
  NeedsReassignment: 'Needs reassignment',
  Resolved: 'Resolved',
};

const REASON_LABEL: Record<EscalationReason, string> = {
  AcceptedUnresolved: 'Accepted appeal — awaiting re-grade',
  ChainExhausted: 'Two overdue appeals — awaiting review',
};

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

interface AssignModalProps {
  escalatedCase: EscalatedCase | null;
  open: boolean;
  onClose: () => void;
  onConfirmed: (updated: EscalatedCase) => void;
}

function AssignModal({ escalatedCase, open, onClose, onConfirmed }: AssignModalProps) {
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

    void loadProfessors(
      escalatedCase.gradeId,
      controller.signal
    );

    return () => controller.abort();
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

function EscalationRow({
  escalatedCase,
  onActionClick,
}: {
  escalatedCase: EscalatedCase;
  onActionClick: (c: EscalatedCase) => void;
}) {
  const isResolved = escalatedCase.escalationStatus === 'Resolved';
  const badgeClass = STATUS_BADGE[escalatedCase.escalationStatus];
  const statusLabel = STATUS_LABEL[escalatedCase.escalationStatus];

  const actionButton =
    escalatedCase.escalationStatus === 'NeedsAssignment' ? (
      <button
        className="btn btn-outline-primary btn-sm text-nowrap"
        onClick={() => onActionClick(escalatedCase)}
      >
        Assign professor
      </button>
    ) : escalatedCase.escalationStatus === 'NeedsReassignment' ? (
      <button
        className="btn btn-outline-warning btn-sm text-nowrap"
        onClick={() => onActionClick(escalatedCase)}
      >
        Reassign professor
      </button>
    ) : null;

  return (
    <tr className={isResolved ? 'text-muted' : undefined}>
      <td>{escalatedCase.subjectName}</td>
      <td>
        {escalatedCase.studentFirstName} {escalatedCase.studentLastName}
      </td>
      <td>
        {escalatedCase.originalProfessorFirstName} {escalatedCase.originalProfessorLastName}
      </td>
      <td>{escalatedCase.finalGrade}</td>
      <td>{REASON_LABEL[escalatedCase.reason] ?? escalatedCase.reason}</td>
      <td>{formatDate(escalatedCase.escalatedSince)}</td>
      <td>
        <span className={badgeClass}>
          {statusLabel}
          {isResolved && escalatedCase.resolvedAt && (
            <> · {formatDate(escalatedCase.resolvedAt)}</>
          )}
        </span>
      </td>
      <td className="text-end">{actionButton}</td>
    </tr>
  );
}

function EscalationCard({
  escalatedCase,
  onActionClick,
}: {
  escalatedCase: EscalatedCase;
  onActionClick: (c: EscalatedCase) => void;
}) {
  const isResolved = escalatedCase.escalationStatus === 'Resolved';
  const badgeClass = STATUS_BADGE[escalatedCase.escalationStatus];
  const statusLabel = STATUS_LABEL[escalatedCase.escalationStatus];

  return (
    <div className={`card mb-2${isResolved ? ' text-muted' : ''}`}>
      <div className="card-body">
        <div className="fw-bold">{escalatedCase.subjectName}</div>
        <div className="small">
          {escalatedCase.studentFirstName} {escalatedCase.studentLastName}
        </div>
        <div className="small text-muted">
          Prof. {escalatedCase.originalProfessorFirstName} {escalatedCase.originalProfessorLastName}
        </div>
        <div className="my-1">
          <span className={badgeClass}>
            {statusLabel}
            {isResolved && escalatedCase.resolvedAt && (
              <> · {formatDate(escalatedCase.resolvedAt)}</>
            )}
          </span>
        </div>
        <div className="small mb-2">{REASON_LABEL[escalatedCase.reason] ?? escalatedCase.reason}</div>
        <div className="small text-muted mb-2">Grade: {escalatedCase.finalGrade}</div>
        {escalatedCase.escalationStatus === 'NeedsAssignment' && (
          <button
            className="btn btn-outline-primary btn-sm w-100"
            onClick={() => onActionClick(escalatedCase)}
          >
            Assign professor
          </button>
        )}
        {escalatedCase.escalationStatus === 'NeedsReassignment' && (
          <button
            className="btn btn-outline-warning btn-sm w-100"
            onClick={() => onActionClick(escalatedCase)}
          >
            Reassign professor
          </button>
        )}
      </div>
    </div>
  );
}

const EscalationsTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const { cases, totalCount, isLoading, error } = useEscalations(page, pageSize);
  const [selectedCase, setSelectedCase] = useState<EscalatedCase | null>(null);
  const [caseList, setCaseList] = useState<EscalatedCase[]>([]);

  // Sync hook data into local state so we can update rows in place after assign/reassign
  React.useEffect(() => {
    setCaseList(cases);
  }, [cases]);

  const handleConfirmed = (updated: EscalatedCase) => {
    setCaseList(prev => prev.map(c => c.gradeId === updated.gradeId ? updated : c));
    setSelectedCase(null);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPage(1);
    setPageSize(newSize);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <span className="spinner-border" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error.message}</div>;
  }

  return (
    <>
      <h3>Escalations</h3>

      {!caseList.length ? (
        <p className="text-muted">No escalated cases.</p>
      ) : (
        <>
          {/* Desktop table — hidden below md */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Student</th>
                  <th>Original Professor</th>
                  <th>Grade</th>
                  <th>Reason</th>
                  <th>Escalated Since</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {caseList.map(c => (
                  <EscalationRow
                    key={c.gradeId}
                    escalatedCase={c}
                    onActionClick={setSelectedCase}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — hidden at md and above */}
          <div className="d-md-none">
            {caseList.map(c => (
              <EscalationCard
                key={c.gradeId}
                escalatedCase={c}
                onActionClick={setSelectedCase}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-3">
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={totalCount}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </>
      )}

      <AssignModal
        escalatedCase={selectedCase}
        open={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        onConfirmed={handleConfirmed}
      />
    </>
  );
};

export default EscalationsTab;
