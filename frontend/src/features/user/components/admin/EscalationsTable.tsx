import type { EscalatedCase, EscalationStatus, EscalationReason } from '../../../escalations/models/escalation';
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

export const REASON_LABEL: Record<EscalationReason, string> = {
  AcceptedUnresolved: 'Accepted appeal — awaiting re-grade',
  ChainExhausted: 'Two overdue appeals — awaiting review',
};

type CaseActionProps = {
  escalatedCase: EscalatedCase;
  onActionClick: (c: EscalatedCase) => void;
};

function EscalationRow({ escalatedCase, onActionClick }: CaseActionProps) {
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

function EscalationCard({ escalatedCase, onActionClick }: CaseActionProps) {
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

type EscalationsTableProps = {
  cases: EscalatedCase[];
  onActionClick: (c: EscalatedCase) => void;
};

export function EscalationsTable({ cases, onActionClick }: EscalationsTableProps) {
  if (!cases.length) return <p className="text-muted">No escalated cases.</p>;

  return (
    <>
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
            {cases.map(c => (
              <EscalationRow key={c.gradeId} escalatedCase={c} onActionClick={onActionClick} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-md-none">
        {cases.map(c => (
          <EscalationCard key={c.gradeId} escalatedCase={c} onActionClick={onActionClick} />
        ))}
      </div>
    </>
  );
}
