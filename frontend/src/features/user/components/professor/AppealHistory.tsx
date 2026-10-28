import type { AssignedCaseAppeal } from '../../models/professor/professorDashboard';

function AppealHistory({ appeals }: { appeals: AssignedCaseAppeal[] }) {
  if (!appeals.length) return null;

  const renderItem = (a: AssignedCaseAppeal, i: number) => (
    <div key={a.id} className="p-2 mb-2 rounded border small">
      <div className="d-flex justify-content-between mb-1">
        <span className="fw-semibold">Appeal {i + 1}</span>
        <span className="text-muted">{new Date(a.submittedAt).toLocaleDateString()}</span>
      </div>
      <div className="text-muted mb-1">Status: {a.status}</div>
      <div>{a.text}</div>
    </div>
  );

  return (
    <div className="mb-3">
      <h6 className="fw-semibold mb-2">Appeal History</h6>
      {appeals.map(renderItem)}
    </div>
  );
}

export default AppealHistory;
