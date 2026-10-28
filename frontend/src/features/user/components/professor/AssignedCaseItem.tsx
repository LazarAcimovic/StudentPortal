import type { AssignedCase } from '../../models/professor/professorDashboard';
import { REASON_LABEL } from '../../constants/professor/constants';

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

export default AssignedCaseItem;
